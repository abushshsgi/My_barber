"""Mock salon sharhlari — booking + Review jadvaliga yoziladi."""

from __future__ import annotations

import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from bookings.models import Booking, Review

User = get_user_model()

MOCK_REVIEW_MARKER = "mock-review-user"

REVIEW_TEXTS_UZ = [
    "Juda yaxshi xizmat, ustalar professional!",
    "Toza va qulay muhit, yana kelaman.",
    "Vaqtida qabul qilishdi, natijadan mamnunman.",
    "Narx-sifat nisbati a'lo.",
    "Do'stlarga tavsiya qilaman.",
    "Kutish zonasi qulay, choy ham bor edi.",
    "Soch olish juda sifatli bo'ldi.",
    "Yaxshi, lekin biroz kutishga to'g'ri keldi.",
    "Usta muloyim, natija kutganimdan yaxshi.",
    "Salon toza, xizmat tez va sifatli.",
    "Qayta bron qilaman, juda yoqdi.",
    "Narxlar mos, xizmat darajasi yuqori.",
]

REVIEW_TEXTS_RU = [
    "Отличный сервис, мастера профессионалы!",
    "Чисто и уютно, приду ещё.",
    "Приняли вовремя, результатом доволен.",
    "Отличное соотношение цены и качества.",
    "Рекомендую друзьям.",
    "Удобная зона ожидания.",
    "Стрижка получилась на высоте.",
    "Хорошо, но пришлось немного подождать.",
]

REVIEW_NAMES = [
    "Sardor", "Dilshod", "Malika", "Jasur", "Timur", "Aziza", "Bobur", "Nilufar",
    "Shahzod", "Kamola", "Rustam", "Madina", "Otabek", "Diyora", "Farhod", "Sevara",
    "Alisher", "Gulnora", "Bekzod", "Nargiza", "Javohir", "Laylo", "Sanjar", "Zuhra",
    "Mirzo", "Dilafruz", "Ulug'bek", "Mohira", "Ismoil", "Charos",
]

KIND_REVIEW_COUNT = {
    "barber": (6, 10),
    "beauty": (7, 12),
    "nails": (5, 9),
    "spa": (6, 11),
}


def _ensure_mock_customers(count: int = 30) -> list:
    users = []
    now = timezone.now()
    for i in range(1, count + 1):
        email = f"mock-review-{i:03d}@mybarber.test"
        phone = f"+99893{9000000 + i:07d}"[:13]
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "phone": phone,
                "full_name": REVIEW_NAMES[(i - 1) % len(REVIEW_NAMES)],
                "region": "TOSHKENT_SH",
                "onboarding_completed": True,
            },
        )
        if not created and not user.full_name:
            user.full_name = REVIEW_NAMES[(i - 1) % len(REVIEW_NAMES)]
            user.save(update_fields=["full_name"])
        users.append(user)
    return users


def seed_reviews_for_salon(salon, barber, kind: str, customers: list, rng: random.Random) -> int:
    """Salon uchun mock booking + review yaratadi. Mavjud mock reviewlar qayta yozilmaydi."""
    existing = Review.objects.filter(salon=salon).count()
    if existing > 0:
        return 0

    lo, hi = KIND_REVIEW_COUNT.get(kind, (6, 10))
    target = rng.randint(lo, hi)
    now = timezone.now()
    created = 0

    for i in range(target):
        customer = customers[rng.randint(0, len(customers) - 1)]
        days_ago = rng.randint(2, 120)
        start = now - timedelta(days=days_ago, hours=rng.randint(1, 8))
        end = start + timedelta(minutes=45)

        rating_roll = rng.randint(1, 100)
        if rating_roll > 92:
            rating = 3
        elif rating_roll > 78:
            rating = 4
        else:
            rating = 5

        text = rng.choice(REVIEW_TEXTS_UZ)
        if rng.random() < 0.15:
            text = rng.choice(REVIEW_TEXTS_RU)

        booking = Booking.objects.create(
            customer=customer,
            barber=barber,
            salon=salon,
            start_at=start,
            end_at=end,
            status=Booking.Status.COMPLETED,
            total_price=Decimal(str(rng.randint(50_000, 350_000))),
            customer_phone=customer.phone or "",
        )
        Review.objects.create(
            booking=booking,
            author=customer,
            salon=salon,
            barber=barber,
            rating=rating,
            text=text,
        )
        created += 1

    return created


def purge_mock_review_users() -> int:
    deleted, _ = User.objects.filter(email__startswith="mock-review-", email__endswith="@mybarber.test").delete()
    return deleted
