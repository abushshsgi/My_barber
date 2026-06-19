"""Toshkent bo'ylab 50 ta demo salon/barber — faqat mock (keyin o'chiriladi)."""

MOCK_MARKER = "MOCK_TOSHKENT"

# Unsplash barber / beauty / nails / spa rasmlari (har biri alohida)
COVER_PHOTO_IDS = [
    "1585747860715-2ba37e788f70",
    "1560066984-138dadb4c035",
    "1503957904860-b89353870476",
    "1621605815971-fbc98d665033",
    "1599356854054-f03d66e2e884",
    "1633681926022-84c23e8c1109",
    "1521590832167-b7c1110bb605",
    "1620331314712-6b4f2a6a0f8f",
    "1605497788041-7a4e6300984e",
    "1522337360788-8faa13fd3ef7",
    "1492106087820-71f1a00d2b11",
    "1540555700478-4be289fbe638",
    "1604654894617-8170df178cd9",
    "1632345031435-8727f6897c53",
    "1622287163692-834b1f829c9e",
    "1522335785662-8d0b3a2a7b1c",
    "1516975080664-ed784fc45416",
    "1562322140-8baeececf3df",
    "1527792820354-dcf1d99a6b1d",
    "1519699047931-ec1a8757a2b0",
    "1507003211169-0a1dd7228f2d",
    "1517841905240-472988babdf9",
    "1532712938310-34c9b2a5d4b2",
    "1524504388940-b1c1d0a5b5b5",
    "1515886657611-9f3525b086c9",
    "1465456419762-a5853b5dfe83",
    "1522336572450-63b25221c137",
    "1487412720507-e7ab37603c6f",
    "1519341450188-fa7adf056118",
    "1522338247202-2c9a0d0b0b0b",
    "1559599101-f097955fb601",
    "1595476104070-2ab726f5a7b5",
    "1582095135526-94af777716df",
    "1521590842887-9c0c259fd2a0",
    "1515377867743-678ea3e16a0f",
    "1522336572450-63b25221c137",
    "1560472354-b33ff0c44a43",
    "1519699047931-ec1a8757a2b0",
    "1524502764237-884916a1e7d3",
    "1515886657611-9f3525b086c9",
    "1522335785662-8d0b3a3a7b1c",
    "1517841905240-472988babdf9",
    "1503957904860-b89353870476",
    "1621605815971-fbc98d665033",
    "1599356854054-f03d66e2e884",
    "1633681926022-84c23e8c1109",
    "1521590832167-b7c1110bb605",
    "1620331314712-6b4f2a6a0f8f",
    "1605497788041-7a4e6300984e",
    "1522337360788-8faa13fd3ef7",
]

SERVICE_TEMPLATES = {
    "barber": [
        ("Erkaklar soch olish", 80000, 45),
        ("Soqol va trim", 50000, 30),
        ("Kompleks (soch + soqol)", 120000, 60),
        ("Bolalar soch olish", 60000, 30),
        ("Ukladka va styling", 70000, 35),
        ("Kamuflyaj va bo'yash", 90000, 40),
    ],
    "beauty": [
        ("Ayollar soch kesish", 90000, 50),
        ("Soch bo'yash", 180000, 90),
        ("Keratin davolash", 350000, 120),
        ("Makiyaj", 150000, 60),
        ("Qosh va kirpik", 80000, 40),
        ("Teri parvarishi", 120000, 50),
    ],
    "nails": [
        ("Klassik manikur", 70000, 45),
        ("Gel-lak", 100000, 60),
        ("Pedikur", 90000, 60),
        ("Naraschivaniye", 200000, 90),
        ("Nail-art dizayn", 120000, 75),
        ("Parafin terapiya", 80000, 40),
    ],
    "spa": [
        ("Klassik massaj", 150000, 60),
        ("Turk hammomi", 200000, 90),
        ("Sauna va relaks", 120000, 60),
        ("Choy va aromaterapiya", 80000, 45),
        ("Yuz parvarishi", 130000, 50),
        ("Tana peeling", 160000, 55),
    ],
}

_DISTRICTS = [
    ("Yunusobod", 41.3542, 69.2891),
    ("Chilonzor", 41.2745, 69.2043),
    ("Mirzo Ulug'bek", 41.3418, 69.3347),
    ("Yakkasaroy", 41.2921, 69.2712),
    ("Sergeli", 41.2256, 69.2189),
    ("Olmazor", 41.3189, 69.1987),
    ("Shayxontohur", 41.3124, 69.2418),
    ("Uchtepa", 41.3087, 69.1789),
    ("Yashnobod", 41.3156, 69.3021),
    ("Mirobod", 41.2995, 69.2789),
]

_STREETS = [
    "Amir Temur ko'chasi",
    "Navoiy ko'chasi",
    "Bobur ko'chasi",
    "Mustaqillik shoh ko'chasi",
    "Shota Rustaveli ko'chasi",
    "Buyuk Ipak yo'li",
    "Farobiy ko'chasi",
    "Bunyodkor ko'chasi",
    "Oybek ko'chasi",
    "Qoratosh ko'chasi",
    "Afrosiyob ko'chasi",
    "Yangi Qo'yliq ko'chasi",
    "Temur Malik ko'chasi",
    "Samarqand Darvoza",
    "Registon ko'chasi",
    "Chorsu bozori yonida",
    "Minor metro yonida",
    "Tinchlik ko'chasi",
    "Beruniy ko'chasi",
    "Fidokor ko'chasi",
]

_NAME_PREFIXES = {
    "barber": [
        "Black Blade", "Gentleman's Cut", "Navoiy Barber", "Urban Fade", "Classic Barbers",
        "Sartarosh Uyi", "Brothers Cut", "Old School", "Premium Fade", "Barber House",
        "Iron Comb", "Sharp Line", "Master Cut", "Royal Barber", "Street Style",
    ],
    "beauty": [
        "Glow Studio", "Beauty Lab", "Silk Hair", "Luxe Beauty", "Chic Salon",
        "Rose Beauty", "Elite Style", "Viva Beauty", "Pearl Studio", "Femme Salon",
    ],
    "nails": [
        "Nail Art Studio", "Gel Pro", "Pink Nails", "Lux Nails", "Nail House",
        "Polish Bar", "Nail Lounge", "Manicure Club", "Diamond Nails", "Nail Atelier",
    ],
    "spa": [
        "Relax Spa", "Harmony Spa", "Zen Wellness", "Oasis Spa", "Pure Spa",
        "Serenity", "Body & Soul", "Golden Spa", "Fresh Spa", "Calm Retreat",
    ],
}

_KINDS = ["barber", "barber", "barber", "beauty", "nails", "spa"]


def _build_entries() -> list[dict]:
    entries: list[dict] = []
    idx = 0
    for district, base_lat, base_lng in _DISTRICTS:
        for street in _STREETS[:5]:
            if idx >= 50:
                break
            kind = _KINDS[idx % len(_KINDS)]
            prefix = _NAME_PREFIXES[kind][idx % len(_NAME_PREFIXES[kind])]
            slug = f"mock-tashkent-{idx + 1:03d}"
            jitter_lat = base_lat + ((idx % 7) - 3) * 0.0018
            jitter_lng = base_lng + ((idx % 5) - 2) * 0.0021
            entries.append(
                {
                    "slug": slug,
                    "name": f"{prefix} — {district}",
                    "kind": kind,
                    "address": f"{street}, {district} tumani, Toshkent",
                    "lat": round(jitter_lat, 6),
                    "lng": round(jitter_lng, 6),
                    "cover_photo_id": COVER_PHOTO_IDS[idx % len(COVER_PHOTO_IDS)],
                }
            )
            idx += 1
        if idx >= 50:
            break
    return entries


TASHKENT_MOCK_SALONS: list[dict] = _build_entries()

assert len(TASHKENT_MOCK_SALONS) == 50, f"Expected 50 salons, got {len(TASHKENT_MOCK_SALONS)}"
