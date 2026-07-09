"""Uzcombinator / investor demo — 30 salon (15 Toshkent + 15 Buxoro), 10 barber."""

from __future__ import annotations

from salons.mock.tashkent_salons import SERVICE_TEMPLATES

DEMO_MARKER = "DEMO_MYSALOON"
DEMO_SALON_COUNT = 30
DEMO_BARBER_COUNT = 10
DEMO_SALONS_PER_CITY = 15
DEMO_BARBERS_PER_CITY = 5
DEMO_BARBER_PASSWORD = "DemoBarber2026!"

DEMO_REGION_TOSHKENT = "TOSHKENT_SH"
DEMO_REGION_BUXORO = "BUXORO"

_TOSHKENT_CENTER = (41.2995, 69.2401)
_BUXORO_CENTER = (39.7747, 64.4286)

_DEMO_BARBERS: list[dict] = [
    {"slug": "demo-barber-01", "full_name": "Jasur Rahimov", "phone": "+998901110101", "region": DEMO_REGION_TOSHKENT},
    {"slug": "demo-barber-02", "full_name": "Bobur Tursunov", "phone": "+998901110102", "region": DEMO_REGION_TOSHKENT},
    {"slug": "demo-barber-03", "full_name": "Sardor Karimov", "phone": "+998901110103", "region": DEMO_REGION_TOSHKENT},
    {"slug": "demo-barber-04", "full_name": "Timur Nazarov", "phone": "+998901110104", "region": DEMO_REGION_TOSHKENT},
    {"slug": "demo-barber-05", "full_name": "Rustam Alimov", "phone": "+998901110105", "region": DEMO_REGION_TOSHKENT},
    {"slug": "demo-barber-06", "full_name": "Shahzod Yusupov", "phone": "+998901110106", "region": DEMO_REGION_BUXORO},
    {"slug": "demo-barber-07", "full_name": "Otabek Mirzayev", "phone": "+998901110107", "region": DEMO_REGION_BUXORO},
    {"slug": "demo-barber-08", "full_name": "Bekzod Ismoilov", "phone": "+998901110108", "region": DEMO_REGION_BUXORO},
    {"slug": "demo-barber-09", "full_name": "Farhod Ergashev", "phone": "+998901110109", "region": DEMO_REGION_BUXORO},
    {"slug": "demo-barber-10", "full_name": "Ulug'bek Qodirov", "phone": "+998901110110", "region": DEMO_REGION_BUXORO},
]

# (name, district, lat, lng, street)
_TOSHKENT_SALON_BLUEPRINTS: list[tuple[str, str, float, float, str]] = [
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
]

_BUXORO_SALON_BLUEPRINTS: list[tuple[str, str, float, float, str]] = [
    ("Registon Barber", "Markaz", 39.7681, 64.4556, "Mustaqillik ko'chasi, 18"),
    ("Minorai Kalon Cut", "Eski shahar", 39.7756, 64.4223, "Poi Kalon yo'li, 4"),
    ("Nasaf Fade", "Markaz", 39.7710, 64.4310, "Navoiy ko'chasi, 56"),
    ("Ark Barbers", "Eski shahar", 39.7785, 64.4158, "Ark qal'asi yonida, 2"),
    ("Buxoro Gentleman", "Alpomish", 39.7800, 64.4400, "Alpomish ko'chasi, 31"),
    ("Silk Road Cut", "Markaz", 39.7620, 64.4480, "Ibn Sino ko'chasi, 77"),
    ("Lyabi Hauz Style", "Eski shahar", 39.7740, 64.4195, "Lyabi Hauz maydoni, 1"),
    ("Bahouddin Barber", "Bahouddin", 39.7835, 64.4520, "Bahouddin Naqshband ko'chasi, 9"),
    ("Qorako'l Fade", "Yoshlar", 39.7590, 64.4620, "Yoshlar ko'chasi, 44"),
    ("Amir Temur Cut", "Markaz", 39.7665, 64.4375, "Amir Temur ko'chasi, 102"),
    ("Chor Minor Barber", "Tarixiy markaz", 39.7703, 64.4262, "Chor Minor ko'chasi, 6"),
    ("Sitorai Mohi Cut", "Mikrorayon", 39.7555, 64.4410, "Sitorai Mohi ko'chasi, 15"),
    ("Buxoro Pro", "Markaz", 39.7728, 64.4498, "Nasaf ko'chasi, 28"),
    ("Old City Fade", "Eski shahar", 39.7768, 64.4172, "Toqi Sarrofon, 11"),
    ("Samani Barber", "Markaz", 39.7642, 64.4533, "Ismoil Somoniy ko'chasi, 63"),
]


def demo_barber_email(slug: str) -> str:
    return f"{slug}@mysaloon.demo"


def _barber_slugs_for_region(region: str) -> list[str]:
    return [b["slug"] for b in _DEMO_BARBERS if b["region"] == region]


def _append_city_salons(
    salons: list[dict],
    blueprints: list[tuple[str, str, float, float, str]],
    *,
    region: str,
    city_label: str,
    barber_slugs: list[str],
    slug_start: int,
) -> None:
    for idx, (name, district, lat, lng, street) in enumerate(blueprints):
        global_idx = slug_start + idx
        owner_slug = barber_slugs[idx % len(barber_slugs)]
        salons.append(
            {
                "slug": f"demo-salon-{global_idx + 1:02d}",
                "name": f"{name} — {district}",
                "kind": "barber",
                "region": region,
                "city_label": city_label,
                "address": f"{street}, {district}, {city_label}",
                "lat": round(lat + ((idx % 5) - 2) * 0.0008, 6),
                "lng": round(lng + ((idx % 7) - 3) * 0.0009, 6),
                "owner_slug": owner_slug,
            }
        )


def build_demo_salons() -> list[dict]:
    salons: list[dict] = []
    _append_city_salons(
        salons,
        _TOSHKENT_SALON_BLUEPRINTS,
        region=DEMO_REGION_TOSHKENT,
        city_label="Toshkent",
        barber_slugs=_barber_slugs_for_region(DEMO_REGION_TOSHKENT),
        slug_start=0,
    )
    _append_city_salons(
        salons,
        _BUXORO_SALON_BLUEPRINTS,
        region=DEMO_REGION_BUXORO,
        city_label="Buxoro",
        barber_slugs=_barber_slugs_for_region(DEMO_REGION_BUXORO),
        slug_start=DEMO_SALONS_PER_CITY,
    )
    return salons


def demo_barber_profile_location(region: str) -> tuple[float, float, str]:
    if region == DEMO_REGION_BUXORO:
        lat, lng = _BUXORO_CENTER
        return lat, lng, "Buxoro"
    lat, lng = _TOSHKENT_CENTER
    return lat, lng, "Toshkent"


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
assert len([s for s in DEMO_SALONS if s["region"] == DEMO_REGION_TOSHKENT]) == DEMO_SALONS_PER_CITY
assert len([s for s in DEMO_SALONS if s["region"] == DEMO_REGION_BUXORO]) == DEMO_SALONS_PER_CITY

DEMO_SERVICE_TEMPLATES = SERVICE_TEMPLATES["barber"]
