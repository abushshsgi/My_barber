from __future__ import annotations

import json
from typing import Any

from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction

from accounts.phone_utils import normalize_phone_field

from barbers.models import Barber, BarberProfile, BarberSignupSnapshot


def create_barber_with_flow(validated_data: dict[str, Any]) -> Barber:
    """
    Flow-based barber signup orchestration.
    Keeps serializer lean and makes each onboarding branch explicit/testable.
    """
    payload = dict(validated_data)
    flow = (str(payload.get("onboarding_flow") or "") or "").strip()
    if flow == Barber.OnboardingFlow.EMPLOYEE:
        return _create_employee(payload)
    if flow == Barber.OnboardingFlow.MYBARBER:
        return _create_mybarber(payload)
    if flow == Barber.OnboardingFlow.INDEPENDENT:
        return _create_independent(payload)
    # Default and explicit OWNER both come here.
    return _create_owner(payload)


def _create_owner(data: dict[str, Any]) -> Barber:
    data["work_mode"] = Barber.WorkMode.SALON
    data["has_salon"] = False
    if not str(data.get("shop_name") or "").strip():
        data["shop_name"] = "Salon yaratilishi kutilmoqda"
    return _persist(data)


def _create_employee(data: dict[str, Any]) -> Barber:
    data["work_mode"] = Barber.WorkMode.SALON
    data["has_salon"] = True
    if not str(data.get("shop_name") or "").strip():
        data["shop_name"] = "Salon tanlash kutilmoqda"
    return _persist(data)


def _create_mybarber(data: dict[str, Any]) -> Barber:
    data["work_mode"] = Barber.WorkMode.SALON
    data["has_salon"] = False
    if not str(data.get("shop_name") or "").strip():
        full_name = str(data.get("full_name") or "").strip()
        data["shop_name"] = f"MyBarber · {full_name}" if full_name else "MyBarber salon"
    return _persist(data)


def _create_independent(data: dict[str, Any]) -> Barber:
    data["work_mode"] = Barber.WorkMode.INDEPENDENT
    data["has_salon"] = False
    if not str(data.get("shop_name") or "").strip():
        data["shop_name"] = "Mustaqil barber"
    return _persist(data)


def _persist(validated_data: dict[str, Any]) -> Barber:
    raw_payload = json.loads(json.dumps(dict(validated_data), cls=DjangoJSONEncoder))

    pwd = validated_data.pop("password")
    email = validated_data.pop("email")
    phone = normalize_phone_field(validated_data.pop("phone", "") or "")
    full_name = validated_data.pop("full_name")
    has_salon = bool(validated_data.pop("has_salon"))
    latitude = validated_data.pop("latitude")
    longitude = validated_data.pop("longitude")
    shop_name = (validated_data.pop("shop_name", "") or "").strip()
    age = validated_data.pop("age", 25)
    region = validated_data.pop("region")
    address = validated_data.pop("address", "") or ""
    staff_count = validated_data.pop("staff_count_at_signup", 1)
    work_mode = validated_data.pop("work_mode", Barber.WorkMode.SALON)
    onboarding_flow = (validated_data.pop("onboarding_flow", "") or "").strip()

    with transaction.atomic():
        barber = Barber(
            email=email,
            username=email,
            phone=phone,
            full_name=full_name,
            region=region,
            work_mode=work_mode,
            onboarding_flow=onboarding_flow,
        )
        barber.set_password(pwd)
        barber.save()
        BarberProfile.objects.update_or_create(
            barber=barber,
            defaults={
                "latitude": latitude,
                "longitude": longitude,
                "location_text": address,
            },
        )
        BarberSignupSnapshot.objects.update_or_create(
            barber=barber,
            defaults={
                "has_salon": has_salon,
                "shop_name": shop_name,
                "age": age,
                "address": address,
                "staff_count_at_signup": staff_count,
                "raw_payload": raw_payload,
            },
        )
    return barber

