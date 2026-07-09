"""Uzcombinator / investor demo — 30 salon, 10 barber akkaunt."""

from __future__ import annotations

from salons.mock.tashkent_salons import SERVICE_TEMPLATES

DEMO_MARKER = "DEMO_MYSALOON"
DEMO_SALON_COUNT = 30
DEMO_BARBER_COUNT = 10
DEMO_BARBER_PASSWORD = "DemoBarber2026!"

_DEMO_BARBERS: list[dict] = [
    {"slug": "demo-barber-01", "full_name": "Jasur Rahimov", "phone": "+998901110101"},
    {"slug": "demo-barber-02", "full_name": "Bobur Tursunov", "phone": "+998901110102"},
    {"slug": "demo-barber-03", "full_name": "Sardor Karimov", "phone": "+998901110103"},
    {"slug": "demo-barber-04", "full_name": "Timur Nazarov", "phone": "+998901110104"},
    {"slug": "demo-barber-05", "full_name": "Rustam Alimov", "phone": "+998901110105"},
    {"slug": "demo-barber-06", "full_name": "Shahzod Yusupov", "phone": "+998901110106"},
    {"slug": "demo-barber-07", "full_name": "Otabek Mirzayev", "phone": "+998901110107"},
    {"slug": "demo-barber-08", "full_name": "Bekzod Ismoilov", "phone": "+998901110108"},
    {"slug": "demo-barber-09", "full_name": "Farhod Ergashev", "phone": "+998901110109"},
    {"slug": "demo-barber-10", "full_name": "Ulug'bek Qodirov", "phone": "+998901110110"},
]

_SALON_BLUEPRINTS: list[dict] = [
    ("Black Blade", "Yunusobod", 41.3542, 69.2891, "Amir Temur ko'chasi, 12"),
    ("Gentleman's Cut", "Chilonzor", 41.2745, 69.2043, "Navoiy ko'chasi, 45"),
    ("Urban Fade", "Mirzo Ulug'bek", 41.3418, 69.3347, "Bobur ko'chasi, 8"),
    ("Classic Barbers", "Yakkasaroy", 41.2921, 69.2712, "Mustaqillik shoh ko'chasi, 101"),
    ("Premium Fade", "Sergeli", 41.2256, 69.2189, "Shota Rustaveli ko'chasi, 33"),
    ("Barber House", "Olmazor", 41.3189, 69.1987, "Buyuk Ipak yo'li, 77"),
    ("Iron Comb", "Shayxontohur", 41.3124, 69.2418, "Farobiy ko'chasi, 19"),
    ("Sharp Line", "Uchtepa", 41.3087, 69.1789, "Bunyodkor ko'chasi, 56"),
    ("Master Cut", "Yashnobod", 41.3156, 69.3021, "Oybek ko'chasi, 24"),
    ("Royal Barber", "Mirobod", 41.2995, 69.2789, "Qoratosh ko'chasi, 61"),
    ("Street Style", "Bektemir", 41.2334, 69.3342, "Afrosiyob ko'chasi, 5"),
    ("Fade Kings", "Qibray", 41.3891, 69.4653, "Yangi Qo'yliq ko'chasi, 88"),
    ("Barber Pro", "Zangiota", 41.2567, 69.1456, "Temur Malik ko'chasi, 14"),
    ("Toshkent Cut", "Yunusobod", 41.3610, 69.2950, "Registon ko'chasi, 3"),
    ("Elite Barber", "Chilonzor", 41.2680, 69.2110, "Chorsu bozori yonida, 9"),
    ("Modern Fade", "Mirzo Ulug'bek", 41.3480, 69.3280, "Minor metro yonida, 27"),
    ("Sartarosh Markazi", "Yakkasaroy", 41.2860, 69.2650, "Tinchlik ko'chasi, 41"),
    ("Gold Comb", "Sergeli", 41.2310, 69.2250, "Beruniy ko'chasi, 16"),
    ("Prime Barber", "Olmazor", 41.3240, 69.1920, "Fidokor ko'chasi, 52"),
    ("Fresh Cut", "Shayxontohur", 41.3060, 69.2480, "Ko'kcha ko'chasi, 70"),
    ("Style Lab", "Uchtepa", 41.3020, 69.1840, "Qatortol ko'chasi, 11"),
    ("Navoiy Barber", "Yashnobod", 41.3200, 69.3080, "Labzak ko'chasi, 38"),
    ("Brothers Cut", "Mirobod", 41.2930, 69.2720, "Sirdaryo ko'chasi, 22"),
    ("Old School", "Bektemir", 41.2390, 69.3290, "Ziyokor ko'chasi, 6"),
    ("Barber Studio", "Qibray", 41.3820, 69.4580, "Amir Temur ko'chasi, 201"),
    ("Gentlemen Club", "Zangiota", 41.2490, 69.1520, "Navoiy ko'chasi, 93"),
    ("Fade Factory", "Yunusobod", 41.3570, 69.3010, "Bobur ko'chasi, 64"),
    ("Cut & Style", "Chilonzor", 41.2710, 69.1980, "Mustaqillik shoh ko'chasi, 155"),
    ("Barber Lounge", "Mirzo Ulug'bek", 41.3360, 69.3410, "Shota Rustaveli ko'chasi, 7"),
    ("Top Fade", "Yakkasaroy", 41.2980, 69.2760, "Buyuk Ipak yo'li, 120"),
]


def demo_barber_email(slug: str) -> str:
    return f"{slug}@mysaloon.demo"


def build_demo_salons() -> list[dict]:
    salons: list[dict] = []
    for idx, (name, district, lat, lng, street) in enumerate(_SALON_BLUEPRINTS):
        owner_idx = idx % DEMO_BARBER_COUNT
        salons.append(
            {
                "slug": f"demo-salon-{idx + 1:02d}",
                "name": f"{name} — {district}",
                "kind": "barber",
                "address": f"{street}, {district} tumani, Toshkent",
                "lat": round(lat + ((idx % 5) - 2) * 0.0008, 6),
                "lng": round(lng + ((idx % 7) - 3) * 0.0009, 6),
                "owner_slug": _DEMO_BARBERS[owner_idx]["slug"],
            }
        )
    return salons


DEMO_BARBERS: list[dict] = [
    {
        **barber,
        "email": demo_barber_email(barber["slug"]),
        "username": barber["slug"].replace("-", "_"),
    }
    for barber in _DEMO_BARBERS
]

DEMO_SALONS: list[dict] = build_demo_salons()

assert len(DEMO_SALONS) == DEMO_SALON_COUNT
assert len(DEMO_BARBERS) == DEMO_BARBER_COUNT
assert len({s["name"] for s in DEMO_SALONS}) == DEMO_SALON_COUNT

DEMO_SERVICE_TEMPLATES = SERVICE_TEMPLATES["barber"]
