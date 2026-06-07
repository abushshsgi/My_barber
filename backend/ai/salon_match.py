"""AI tavsiyalarini haqiqiy salon/barber bilan bog'lash."""

from __future__ import annotations

from salons.models import Salon, SalonMembership


def attach_salons_to_suggestions(suggestions: list[dict]) -> list[dict]:
    salons = list(
        Salon.objects.filter(is_published=True)
        .select_related("owner_barber")
        .order_by("-premium", "-created_at")[:12]
    )
    if not salons:
        for item in suggestions:
            item["salon_id"] = None
            item["salon_name"] = None
            item["barber_name"] = None
        return suggestions

    memberships = (
        SalonMembership.objects.filter(
            salon_id__in=[s.id for s in salons],
            barber__isnull=False,
            barber__is_active=True,
        )
        .select_related("barber")
        .order_by("salon_id", "id")
    )
    staff_by_salon: dict[int, list[str]] = {}
    for m in memberships:
        if m.barber_id and m.barber:
            name = (m.barber.full_name or m.barber.email or "").strip()
            if name:
                staff_by_salon.setdefault(m.salon_id, []).append(name)

    enriched: list[dict] = []
    for idx, item in enumerate(suggestions):
        salon = salons[idx % len(salons)]
        staff = staff_by_salon.get(salon.id) or []
        if staff:
            barber_name = staff[idx % len(staff)]
        elif salon.owner_barber:
            barber_name = salon.owner_barber.full_name or salon.owner_barber.email
        else:
            barber_name = None
        item = {**item, "salon_id": salon.id, "salon_name": salon.name, "barber_name": barber_name}
        enriched.append(item)
    return enriched
