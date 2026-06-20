from __future__ import annotations

from decimal import Decimal

from accounts.models import User, UserAddress
from accounts.uz_regions import UzRegion
from geo.region_resolver import resolve_region_from_coords
from geo.services.dgis import DgisGeocoderError, reverse_geocode


def sync_user_active_location(user: User) -> None:
    """Asosiy manzil bo'yicha profil region va GPS ni yangilash (tavsiya algoritmi uchun)."""
    addr = (
        UserAddress.objects.filter(user=user, is_default=True)
        .order_by("-updated_at")
        .first()
    )
    if addr is None:
        return
    user.region = addr.region
    user.latitude = addr.latitude
    user.longitude = addr.longitude
    user.save(update_fields=["region", "latitude", "longitude"])


def set_default_address(user: User, address: UserAddress) -> None:
    UserAddress.objects.filter(user=user).exclude(pk=address.pk).update(is_default=False)
    if not address.is_default:
        address.is_default = True
        address.save(update_fields=["is_default"])
    sync_user_active_location(user)


def quantize_coord(value) -> Decimal | None:
    if value is None:
        return None
    from decimal import ROUND_HALF_UP

    return Decimal(str(value)).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)


def _region_display(code: str) -> str:
    for value, label in UzRegion.choices:
        if value == code:
            return label
    return code


def _address_line_from_profile(user: User) -> str:
    lat = user.latitude
    lng = user.longitude
    if lat is not None and lng is not None:
        try:
            result = reverse_geocode(float(lat), float(lng))
            if result:
                line = (result.full_name or result.address or "").strip()
                if len(line) >= 3:
                    return line[:512]
        except DgisGeocoderError:
            pass
        resolved = resolve_region_from_coords(float(lat), float(lng))
        if resolved.city_label and len(resolved.city_label.strip()) >= 3:
            return resolved.city_label.strip()[:512]
    region_label = _region_display(user.region)
    return region_label[:512] if region_label else "Profil manzili"


def ensure_home_address_from_profile(user: User) -> UserAddress | None:
    """Signup/onboarding GPS profilda bo'lsa, saqlangan manzil yo'q bo'lsa uy manzilini yaratadi."""
    if UserAddress.objects.filter(user=user).exists():
        return None
    region = (user.region or "").strip()
    if not region or user.latitude is None or user.longitude is None:
        return None
    addr = UserAddress.objects.create(
        user=user,
        label=UserAddress.Label.HOME,
        address_line=_address_line_from_profile(user),
        region=region,
        latitude=quantize_coord(user.latitude),
        longitude=quantize_coord(user.longitude),
        is_default=True,
    )
    return addr
