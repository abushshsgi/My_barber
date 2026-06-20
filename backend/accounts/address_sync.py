from __future__ import annotations

from decimal import Decimal

from accounts.models import User, UserAddress


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
