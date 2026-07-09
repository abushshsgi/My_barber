"""Uzcombinator / investor demo — Toshkent (40+20) va Buxoro (15+5)."""

from __future__ import annotations

from salons.mock.tashkent_salons import SERVICE_TEMPLATES

DEMO_MARKER = "DEMO_MYSALOON"
DEMO_TOSHKENT_SALON_COUNT = 40
DEMO_TOSHKENT_BARBER_COUNT = 20
DEMO_BUXORO_SALON_COUNT = 15
DEMO_BUXORO_BARBER_COUNT = 5
DEMO_SALON_COUNT = DEMO_TOSHKENT_SALON_COUNT + DEMO_BUXORO_SALON_COUNT
DEMO_BARBER_COUNT = DEMO_TOSHKENT_BARBER_COUNT + DEMO_BUXORO_BARBER_COUNT
DEMO_BARBER_PASSWORD = "DemoBarber2026!"

DEMO_REGION_TOSHKENT = "TOSHKENT_SH"
DEMO_REGION_BUXORO = "BUXORO"

# Eski testlar uchun
DEMO_SALONS_PER_CITY = DEMO_TOSHKENT_SALON_COUNT
DEMO_BARBERS_PER_CITY = DEMO_TOSHKENT_BARBER_COUNT

_TOSHKENT_CENTER = (41.2995, 69.2401)
_BUXORO_CENTER = (39.7747, 64.4286)

_BARBER_FIRST_NAMES = [
    "Jasur",
    "Bobur",
    "Sardor",
    "Timur",
    "Rustam",
    "Shahzod",
    "Otabek",
    "Bekzod",
    "Farhod",
    "Ulug'bek",
    "Aziz",
    "Dilshod",
    "Javohir",
    "Kamol",
    "Mirzo",
    "Nodir",
    "Parviz",
    "Ravshan",
    "Sanjar",
    "Temur",
    "Umid",
    "Vohid",
    "Yusuf",
    "Zafar",
    "Alisher",
]

_BARBER_LAST_NAMES = [
    "Rahimov",
    "Tursunov",
    "Karimov",
    "Nazarov",
    "Alimov",
    "Yusupov",
    "Mirzayev",
    "Ismoilov",
    "Ergashev",
    "Qodirov",
    "Saidov",
    "Normatov",
    "Khasanov",
    "Erkinov",
    "Toshev",
]

_TOSHKENT_DISTRICTS: list[tuple[str, float, float]] = [
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

_TOSHKENT_STREETS = [
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
    "Registon ko'chasi",
    "Tinchlik ko'chasi",
    "Beruniy ko'chasi",
    "Ko'kcha ko'chasi",
    "Labzak ko'chasi",
]

_TOSHKENT_SALON_NAMES = [
    "Black Blade",
    "Gentleman's Cut",
    "Urban Fade",
    "Classic Barbers",
    "Premium Fade",
    "Barber House",
    "Iron Comb",
    "Sharp Line",
    "Master Cut",
    "Royal Barber",
    "Street Style",
    "Fade Kings",
    "Barber Pro",
    "Toshkent Cut",
    "Elite Barber",
    "Modern Fade",
    "Sartarosh Markazi",
    "Gold Comb",
    "Prime Barber",
    "Fresh Cut",
    "Style Lab",
    "Navoiy Barber",
    "Brothers Cut",
    "Old School",
    "Barber Studio",
    "Gentlemen Club",
    "Fade Factory",
    "Cut & Style",
    "Barber Lounge",
    "Top Fade",
    "City Fade",
    "Metro Barber",
    "Capital Cut",
    "Silk Fade",
    "Nomad Barber",
    "Vertex Cut",
    "Line Up Pro",
    "Craft Barber",
    "Studio 41",
    "Usta Markazi",
]

_BUXORO_DISTRICTS: list[tuple[str, float, float]] = [
    ("Markaz", 39.7681, 64.4556),
    ("Eski shahar", 39.7756, 64.4223),
    ("Alpomish", 39.7800, 64.4400),
    ("Yoshlar", 39.7590, 64.4620),
    ("Tarixiy markaz", 39.7703, 64.4262),
]

_BUXORO_STREETS = [
    "Mustaqillik ko'chasi",
    "Navoiy ko'chasi",
    "Poi Kalon yo'li",
    "Ibn Sino ko'chasi",
    "Amir Temur ko'chasi",
    "Nasaf ko'chasi",
    "Ismoil Somoniy ko'chasi",
]

_BUXORO_SALON_NAMES = [
    "Registon Barber",
    "Minorai Kalon Cut",
    "Nasaf Fade",
    "Ark Barbers",
    "Buxoro Gentleman",
    "Silk Road Cut",
    "Lyabi Hauz Style",
    "Bahouddin Barber",
    "Qorako'l Fade",
    "Amir Temur Cut",
    "Chor Minor Barber",
    "Sitorai Mohi Cut",
    "Buxoro Pro",
    "Old City Fade",
    "Samani Barber",
]


def demo_barber_email(slug: str) -> str:
    return f"{slug}@mysaloon.demo"


def _build_barbers(*, start_index: int, count: int, region: str) -> list[dict]:
    barbers: list[dict] = []
    for offset in range(count):
        idx = start_index + offset
        barbers.append(
            {
                "slug": f"demo-barber-{idx:02d}",
                "full_name": (
                    f"{_BARBER_FIRST_NAMES[idx % len(_BARBER_FIRST_NAMES)]} "
                    f"{_BARBER_LAST_NAMES[(idx + 3) % len(_BARBER_LAST_NAMES)]}"
                ),
                "phone": f"+99890111{idx:04d}",
                "region": region,
            }
        )
    return barbers


def _build_city_salons(
    *,
    count: int,
    slug_start: int,
    region: str,
    city_label: str,
    barber_slugs: list[str],
    names: list[str],
    districts: list[tuple[str, float, float]],
    streets: list[str],
) -> list[dict]:
    salons: list[dict] = []
    for idx in range(count):
        global_idx = slug_start + idx
        district, lat, lng = districts[idx % len(districts)]
        street = streets[idx % len(streets)]
        owner_slug = barber_slugs[idx % len(barber_slugs)]
        salons.append(
            {
                "slug": f"demo-salon-{global_idx + 1:02d}",
                "name": f"{names[idx % len(names)]} — {district}",
                "kind": "barber",
                "region": region,
                "city_label": city_label,
                "address": f"{street}, {district}, {city_label}",
                "lat": round(lat + ((idx % 5) - 2) * 0.0008, 6),
                "lng": round(lng + ((idx % 7) - 3) * 0.0009, 6),
                "owner_slug": owner_slug,
            }
        )
    return salons


def build_demo_salons() -> list[dict]:
    toshkent_barbers = _build_barbers(start_index=1, count=DEMO_TOSHKENT_BARBER_COUNT, region=DEMO_REGION_TOSHKENT)
    buxoro_barbers = _build_barbers(
        start_index=DEMO_TOSHKENT_BARBER_COUNT + 1,
        count=DEMO_BUXORO_BARBER_COUNT,
        region=DEMO_REGION_BUXORO,
    )
    toshkent_slugs = [b["slug"] for b in toshkent_barbers]
    buxoro_slugs = [b["slug"] for b in buxoro_barbers]

    salons: list[dict] = []
    salons.extend(
        _build_city_salons(
            count=DEMO_TOSHKENT_SALON_COUNT,
            slug_start=0,
            region=DEMO_REGION_TOSHKENT,
            city_label="Toshkent",
            barber_slugs=toshkent_slugs,
            names=_TOSHKENT_SALON_NAMES,
            districts=_TOSHKENT_DISTRICTS,
            streets=_TOSHKENT_STREETS,
        )
    )
    salons.extend(
        _build_city_salons(
            count=DEMO_BUXORO_SALON_COUNT,
            slug_start=DEMO_TOSHKENT_SALON_COUNT,
            region=DEMO_REGION_BUXORO,
            city_label="Buxoro",
            barber_slugs=buxoro_slugs,
            names=_BUXORO_SALON_NAMES,
            districts=_BUXORO_DISTRICTS,
            streets=_BUXORO_STREETS,
        )
    )
    return salons


def demo_barber_profile_location(region: str) -> tuple[float, float, str]:
    if region == DEMO_REGION_BUXORO:
        lat, lng = _BUXORO_CENTER
        return lat, lng, "Buxoro"
    lat, lng = _TOSHKENT_CENTER
    return lat, lng, "Toshkent"


_DEMO_BARBERS_RAW = _build_barbers(start_index=1, count=DEMO_TOSHKENT_BARBER_COUNT, region=DEMO_REGION_TOSHKENT) + _build_barbers(
    start_index=DEMO_TOSHKENT_BARBER_COUNT + 1,
    count=DEMO_BUXORO_BARBER_COUNT,
    region=DEMO_REGION_BUXORO,
)

DEMO_BARBERS: list[dict] = [
    {
        **barber,
        "email": demo_barber_email(barber["slug"]),
        "username": barber["slug"].replace("-", "_"),
    }
    for barber in _DEMO_BARBERS_RAW
]

DEMO_SALONS: list[dict] = build_demo_salons()

assert len(DEMO_SALONS) == DEMO_SALON_COUNT
assert len(DEMO_BARBERS) == DEMO_BARBER_COUNT
assert len({s["name"] for s in DEMO_SALONS}) == DEMO_SALON_COUNT
assert len([s for s in DEMO_SALONS if s["region"] == DEMO_REGION_TOSHKENT]) == DEMO_TOSHKENT_SALON_COUNT
assert len([s for s in DEMO_SALONS if s["region"] == DEMO_REGION_BUXORO]) == DEMO_BUXORO_SALON_COUNT
assert len([b for b in DEMO_BARBERS if b["region"] == DEMO_REGION_TOSHKENT]) == DEMO_TOSHKENT_BARBER_COUNT
assert len([b for b in DEMO_BARBERS if b["region"] == DEMO_REGION_BUXORO]) == DEMO_BUXORO_BARBER_COUNT

DEMO_SERVICE_TEMPLATES = SERVICE_TEMPLATES["barber"]
