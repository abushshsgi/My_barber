"""Demo mijozlar, chatlar, bronlar va bildirishnomalar."""

from __future__ import annotations

DEMO_USER_MARKER = "demo-user"
DEMO_USER_PASSWORD = "DemoUser2026!"

DEMO_USERS: list[dict] = [
    {"slug": "demo-user-01", "full_name": "Dilshod Karimov", "phone": "+998901220101"},
    {"slug": "demo-user-02", "full_name": "Malika Tosheva", "phone": "+998901220102"},
    {"slug": "demo-user-03", "full_name": "Sardor Aliyev", "phone": "+998901220103"},
    {"slug": "demo-user-04", "full_name": "Aziza Rakhimova", "phone": "+998901220104"},
    {"slug": "demo-user-05", "full_name": "Jasur Normatov", "phone": "+998901220105"},
    {"slug": "demo-user-06", "full_name": "Nilufar Saidova", "phone": "+998901220106"},
    {"slug": "demo-user-07", "full_name": "Timur Khasanov", "phone": "+998901220107"},
    {"slug": "demo-user-08", "full_name": "Madina Erkinova", "phone": "+998901220108"},
]

DEMO_CHAT_THREADS: list[list[tuple[str, str]]] = [
    [
        ("USER", "Salom, ertaga soat 15:00 ga joy bormi?"),
        ("BARBER", "Salom! Ha, bo'sh. Qaysi xizmat kerak — soch yoki soch+soqol?"),
        ("USER", "Erkaklar soch olish yetadi."),
        ("BARBER", "Mayli, 15:00 ga qoldirdim. Kutamiz!"),
    ],
    [
        ("USER", "Bugun kechqurun bo'sh vaqt bormi?"),
        ("BARBER", "19:30 dan keyin bo'shman."),
        ("USER", "19:45 ga yozib qo'ying iltimos."),
        ("BARBER", "Tasdiqlandi ✅"),
    ],
    [
        ("USER", "Skin fade qancha vaqt oladi?"),
        ("BARBER", "Taxminan 45 daqiqa. Narxi 80 000 so'm."),
        ("USER", "Yaxshi, shanba kuni kelaman."),
    ],
    [
        ("USER", "Bolam uchun soch olish mumkinmi?"),
        ("BARBER", "Albatta, bolalar xizmati bor — 60 000 so'm."),
        ("USER", "Rahmat, ertaga 11:00 ga bron qilmoqchiman."),
        ("BARBER", "Qabul qilindi, kutamiz."),
    ],
    [
        ("USER", "Kechagi xizmat uchun rahmat, juda yoqdi!"),
        ("BARBER", "Rahmat! Yana ko'rishguncha 🙂"),
    ],
]

NOTIFICATION_SAMPLES: list[tuple[str, str, str]] = [
    ("booking_accepted", "Bron tasdiqlandi", "Ertaga 15:00 — Black Blade salonida kutamiz."),
    ("booking_reminder", "Eslatma", "Broningiz 1 soatdan keyin boshlanadi."),
    ("chat_message", "Yangi xabar", "Ustadan javob keldi."),
    ("promo", "Chegirma", "Bu hafta kompleks xizmat -15%."),
]


def demo_user_email(slug: str) -> str:
    return f"{slug}@mysaloon.demo"
