"""Toshkent bo'ylab 250 ta demo salon/barber — faqat mock (keyin o'chiriladi)."""

MOCK_MARKER = "MOCK_TOSHKENT"
MOCK_SALON_COUNT = 250

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
    ("Bektemir", 41.2334, 69.3342),
    ("Qibray", 41.3891, 69.4653),
    ("Zangiota", 41.2567, 69.1456),
    ("Qorasuv", 41.3123, 69.4567),
    ("Toshkent tuman", 41.3012, 69.2123),
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
    "Ko'kcha ko'chasi",
    "Qatortol ko'chasi",
    "Labzak ko'chasi",
    "Sirdaryo ko'chasi",
    "Ziyokor ko'chasi",
]

_NAME_PREFIXES = {
    "barber": [
        "Black Blade", "Gentleman's Cut", "Navoiy Barber", "Urban Fade", "Classic Barbers",
        "Sartarosh Uyi", "Brothers Cut", "Old School", "Premium Fade", "Barber House",
        "Iron Comb", "Sharp Line", "Master Cut", "Royal Barber", "Street Style",
        "Fade Kings", "Barber Pro", "Toshkent Cut", "Elite Barber", "Modern Fade",
        "Sartarosh Markazi", "Gold Comb", "Prime Barber", "Fresh Cut", "Style Lab",
    ],
    "beauty": [
        "Glow Studio", "Beauty Lab", "Silk Hair", "Luxe Beauty", "Chic Salon",
        "Rose Beauty", "Elite Style", "Viva Beauty", "Pearl Studio", "Femme Salon",
        "Bella Hair", "Grace Beauty", "Lumière", "Velvet Salon", "Chic & Glow",
        "Diamond Beauty", "Aura Studio", "Bloom Salon", "Pure Beauty", "Style Queen",
    ],
    "nails": [
        "Nail Art Studio", "Gel Pro", "Pink Nails", "Lux Nails", "Nail House",
        "Polish Bar", "Nail Lounge", "Manicure Club", "Diamond Nails", "Nail Atelier",
        "Gloss Nails", "Nail Studio", "Perfect Nails", "Color Nails", "Nail Bar",
    ],
    "spa": [
        "Relax Spa", "Harmony Spa", "Zen Wellness", "Oasis Spa", "Pure Spa",
        "Serenity", "Body & Soul", "Golden Spa", "Fresh Spa", "Calm Retreat",
        "Lotus Spa", "Silk Spa", "Tranquil Spa", "Royal Spa", "Wellness Hub",
    ],
}

_KINDS = ["barber", "barber", "barber", "beauty", "nails", "spa"]

# 250 ta salon — tuman+prefix takrorida unique nom uchun (salon_name_unique_ci_trim).
_NAME_SUFFIXES = [
    "",
    " Plus",
    " Pro",
    " Studio",
    " Express",
    " Elite",
    " Grand",
    " Prime",
    " Neo",
    " Lux",
    " One",
    " City",
    " Central",
    " Metro",
    " Park",
    " West",
    " East",
]


def _build_entries() -> list[dict]:
    entries: list[dict] = []
    idx = 0
    street_cycle = 0
    while idx < MOCK_SALON_COUNT:
        for district, base_lat, base_lng in _DISTRICTS:
            if idx >= MOCK_SALON_COUNT:
                break
            street = _STREETS[street_cycle % len(_STREETS)]
            street_cycle += 1
            kind = _KINDS[idx % len(_KINDS)]
            prefix = _NAME_PREFIXES[kind][idx % len(_NAME_PREFIXES[kind])]
            slug = f"mock-tashkent-{idx + 1:03d}"
            jitter_lat = base_lat + ((idx % 11) - 5) * 0.0016
            jitter_lng = base_lng + ((idx % 9) - 4) * 0.0019
            entries.append(
                {
                    "slug": slug,
                    "name": f"{prefix} — {district}",
                    "kind": kind,
                    "address": f"{street}, {district} tumani, Toshkent",
                    "lat": round(jitter_lat, 6),
                    "lng": round(jitter_lng, 6),
                }
            )
            idx += 1
    return entries


TASHKENT_MOCK_SALONS: list[dict] = _build_entries()

assert len(TASHKENT_MOCK_SALONS) == MOCK_SALON_COUNT, (
    f"Expected {MOCK_SALON_COUNT} salons, got {len(TASHKENT_MOCK_SALONS)}"
)
_names = [s["name"] for s in TASHKENT_MOCK_SALONS]
assert len(_names) == len(set(_names)), "Duplicate mock salon names — fix _NAME_SUFFIXES"
