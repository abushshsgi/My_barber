"""Ochiq API uchun salon qulayliklari serializatsiyasi."""

from __future__ import annotations

from salons.models import Amenity, Salon, SalonMembership
from salons.models import Salon as SalonModel


def amenity_lang_from_request(request) -> str:
    if request is None:
        return "uz"
    raw = (request.query_params.get("lang") or request.headers.get("Accept-Language") or "uz").split(
        ","
    )[0]
    code = raw.strip().lower().split("-")[0]
    return code if code in ("uz", "ru", "en") else "uz"


def serialize_amenity(amenity: Amenity, lang: str) -> dict:
    labels = amenity.labels or {}
    label = labels.get(lang) or labels.get("uz") or amenity.code
    return {"code": amenity.code, "icon": amenity.icon, "label": label}


def get_amenities_for_salon(salon: Salon | None, lang: str = "uz") -> list[dict]:
    if salon is None:
        return []
    links = salon.salon_amenities.select_related("amenity").all()
    return [serialize_amenity(link.amenity, lang) for link in links]


def resolve_work_salon_for_barber(barber) -> SalonModel | None:
    """Mijoz katalogi: egasi yoki ACTIVE membership salon (published)."""
    owned = (
        SalonModel.objects.filter(owner_barber=barber, is_published=True)
        .only("id", "name", "latitude", "longitude")
        .first()
    )
    if owned is not None:
        return owned
    membership = (
        SalonMembership.objects.select_related("salon")
        .filter(
            barber=barber,
            invite_state=SalonMembership.InviteState.ACTIVE,
            salon__is_published=True,
        )
        .order_by("-activated_at", "-id")
        .first()
    )
    return membership.salon if membership is not None else None


def barber_booking_context(barber, request=None) -> dict:
    """booking_kind, salon_id, salon_name, amenities for public barber payloads."""
    lang = amenity_lang_from_request(request)
    from barbers.models import Barber

    if barber.work_mode == Barber.WorkMode.INDEPENDENT:
        salon = SalonModel.objects.filter(owner_barber=barber, is_published=True).first()
        if salon is None:
            return {
                "booking_kind": "independent",
                "salon_id": None,
                "salon_name": None,
                "amenities": [],
            }
        return {
            "booking_kind": "salon",
            "salon_id": salon.id,
            "salon_name": salon.name,
            "amenities": get_amenities_for_salon(salon, lang),
        }
    salon = resolve_work_salon_for_barber(barber)
    if salon is None:
        return {
            "booking_kind": "independent",
            "salon_id": None,
            "salon_name": None,
            "amenities": [],
        }
    return {
        "booking_kind": "salon",
        "salon_id": salon.id,
        "salon_name": salon.name,
        "amenities": get_amenities_for_salon(salon, lang),
    }
