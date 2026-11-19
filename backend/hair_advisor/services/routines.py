"""Personal hair care routines."""

from __future__ import annotations

from django.db import transaction

from ai.models import CareProduct, CareUserProduct
from hair_advisor.models import HairRoutine, HairRoutineItem


@transaction.atomic
def get_or_create_current_routine(user) -> HairRoutine:
    routine = HairRoutine.objects.filter(user=user, is_current=True).first()
    if routine is None:
        routine = HairRoutine.objects.create(user=user, is_current=True, name="Asosiy")
    return routine


def add_product_to_routine(user, care_product_id: int, slot: str = "other") -> HairRoutineItem:
    routine = get_or_create_current_routine(user)
    care = CareProduct.objects.filter(pk=care_product_id, is_published=True).first()
    if care is None:
        raise ValueError("Mahsulot topilmadi.")

    CareUserProduct.objects.get_or_create(
        user=user,
        product=care,
        defaults={"source": CareUserProduct.Source.SCAN},
    )

    item, _ = HairRoutineItem.objects.update_or_create(
        routine=routine,
        care_product=care,
        defaults={"slot": slot},
    )
    return item