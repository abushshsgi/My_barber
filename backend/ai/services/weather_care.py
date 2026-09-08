"""Ob-havo va soch parvarishi (Open-Meteo) — UV, soatlik, CTA, mahsulot rejasi."""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from typing import Any

DEFAULT_LAT = 41.2995
DEFAULT_LON = 69.2401

WEEKDAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

CONDITION_BY_CODE: dict[int, str] = {
    0: "clear",
    1: "mainly_clear",
    2: "partly_cloudy",
    3: "overcast",
    45: "fog",
    48: "fog",
    51: "drizzle",
    53: "drizzle",
    55: "drizzle",
    61: "rain",
    63: "rain",
    65: "rain",
    71: "snow",
    73: "snow",
    75: "snow",
    80: "showers",
    81: "showers",
    82: "showers",
    95: "storm",
    96: "storm",
    99: "storm",
}

UZ_REGIONS: list[dict[str, Any]] = [
    {"id": "tashkent", "label_uz": "Toshkent", "lat": 41.3111, "lon": 69.2797},
    {"id": "andijan", "label_uz": "Andijon", "lat": 40.7821, "lon": 72.3442},
    {"id": "bukhara", "label_uz": "Buxoro", "lat": 39.7681, "lon": 64.4556},
    {"id": "fergana", "label_uz": "Farg'ona", "lat": 40.3864, "lon": 71.7864},
    {"id": "jizzakh", "label_uz": "Jizzax", "lat": 40.1158, "lon": 67.8422},
    {"id": "kashkadarya", "label_uz": "Qashqadaryo", "lat": 38.8606, "lon": 65.7891},
    {"id": "navoi", "label_uz": "Navoiy", "lat": 40.1039, "lon": 65.3686},
    {"id": "namangan", "label_uz": "Namangan", "lat": 40.9983, "lon": 71.6726},
    {"id": "samarkand", "label_uz": "Samarqand", "lat": 39.6542, "lon": 66.9597},
    {"id": "sirdarya", "label_uz": "Sirdaryo", "lat": 40.5, "lon": 68.6667},
    {"id": "surkhandarya", "label_uz": "Surxondaryo", "lat": 37.2242, "lon": 67.2783},
    {"id": "khorezm", "label_uz": "Xorazm", "lat": 41.3775, "lon": 60.3619},
    {"id": "karakalpakstan", "label_uz": "Qoraqalpog'iston", "lat": 42.4603, "lon": 59.6164},
]

_REGION_BY_ID = {r["id"]: r for r in UZ_REGIONS}


def list_uz_regions() -> list[dict[str, Any]]:
    return [
        {"id": r["id"], "label_uz": r["label_uz"], "latitude": r["lat"], "longitude": r["lon"]}
        for r in UZ_REGIONS
    ]


def resolve_region_coords(region_id: str | None) -> tuple[float, float, str] | None:
    if not region_id:
        return None
    row = _REGION_BY_ID.get(str(region_id).strip().lower())
    if not row:
        return None
    return float(row["lat"]), float(row["lon"]), str(row["label_uz"])


def _condition_key(code: int | None) -> str:
    if code is None:
        return "unknown"
    return CONDITION_BY_CODE.get(int(code), "cloudy")


def _weekday_key(iso_day: str) -> str:
    try:
        idx = datetime.strptime(iso_day, "%Y-%m-%d").weekday()
    except ValueError:
        idx = 0
    return WEEKDAY_KEYS[idx]


def _fetch_open_meteo(lat: float, lon: float) -> dict[str, Any]:
    params = urllib.parse.urlencode(
        {
            "latitude": f"{lat:.4f}",
            "longitude": f"{lon:.4f}",
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index",
            "hourly": "temperature_2m,weather_code,wind_speed_10m,precipitation_probability,uv_index",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max",
            "forecast_days": 3,
            "timezone": "auto",
        }
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=14) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _reverse_geocode(lat: float, lon: float) -> dict[str, str]:
    params = urllib.parse.urlencode(
        {"latitude": f"{lat:.4f}", "longitude": f"{lon:.4f}", "count": "1", "language": "uz", "format": "json"}
    )
    url = f"https://geocoding-api.open-meteo.com/v1/reverse?{params}"
    empty = {"location_label": "", "location_place": "", "location_region": ""}
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        results = data.get("results") or []
        if not results:
            return empty
        row = results[0]
        name = str(row.get("name") or "").strip()
        admin1 = str(row.get("admin1") or "").strip()
        admin2 = str(row.get("admin2") or "").strip()
        place = name or admin2
        region = admin1
        label = f"{place}, {region}" if place and region and place.casefold() != region.casefold() else (place or region)
        return {"location_label": label, "location_place": place, "location_region": region}
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return empty


def _uv_level(uv: float | None) -> str:
    if uv is None:
        return "unknown"
    if uv < 3:
        return "low"
    if uv < 6:
        return "moderate"
    if uv < 8:
        return "high"
    if uv < 11:
        return "very_high"
    return "extreme"


def _uv_tip(level: str) -> str:
    if level in ("high", "very_high", "extreme"):
        return "Quyosh kuchli — SPF sprey, shlyapa va sochni quritishdan saqlang."
    if level == "moderate":
        return "O'rtacha UV — ochiq havoda ertalab/kechqurun chiqing."
    return "UV past — oddiy rejim yetarli."


def _primary_action(*, condition_key: str, temp_c: float | None, humidity_pct: float | None, wind_kmh: float | None, uv_index: float | None, hair_condition: str) -> dict[str, str]:
    uv_lvl = _uv_level(uv_index)
    if condition_key in ("rain", "showers", "drizzle", "storm"):
        return {"id": "skip_wash", "title": "Bugun yuvmang", "subtitle": "Yomg'irda ortiqcha yuvish scalpni quritadi — leave-in yoki himoya sprey.", "icon": "rainy-outline"}
    if uv_lvl in ("high", "very_high", "extreme"):
        return {"id": "uv_protect", "title": "UV himoya qiling", "subtitle": "SPF / shlyapa · sochni to'g'ridan-to'g'ri quyoshda quritmang.", "icon": "sunny-outline"}
    if humidity_pct is not None and humidity_pct <= 35:
        return {"id": "leave_in", "title": "Leave-in qo'llang", "subtitle": "Havo quruq — namlik uchun leave-in yoki yengil moy.", "icon": "water-outline"}
    if humidity_pct is not None and humidity_pct >= 70:
        return {"id": "anti_frizz", "title": "Frizzni ushlang", "subtitle": "Namlik yuqori — serum/krem, og'ir yog'lardan saqlaning.", "icon": "cloudy-outline"}
    if wind_kmh is not None and wind_kmh >= 28:
        return {"id": "tie_hair", "title": "Sochni bog'lab yuring", "subtitle": "Shamol kuchli — ildizni himoya qiling.", "icon": "flag-outline"}
    if temp_c is not None and temp_c >= 30 and hair_condition == "oily":
        return {"id": "light_wash", "title": "Yengil yuving", "subtitle": "Issiq + yog'li scalp — ildizga yengil shampun.", "icon": "sparkles-outline"}
    if hair_condition in ("dry", "damaged"):
        return {"id": "mask", "title": "Maska / moy", "subtitle": "Quruq yoki shikastlangan soch — kechqurun maska.", "icon": "leaf-outline"}
    return {"id": "steady", "title": "Oddiy rejim", "subtitle": "Bugun barqaror — muntazam yuvish va yengil namlantirish.", "icon": "checkmark-circle-outline"}


def _hair_recommendations(*, temp_c: float | None, humidity_pct: float | None, wind_kmh: float | None, condition_key: str, uv_index: float | None = None, condition: str = "", texture: str = "") -> tuple[str, list[str]]:
    tips: list[str] = []
    summary_parts: list[str] = []
    if temp_c is not None:
        if temp_c >= 32:
            summary_parts.append("juda issiq")
            tips.append("Issiq havo — yengil sprey va UV himoya ishlating.")
        elif temp_c >= 24:
            summary_parts.append("iliq")
        elif temp_c <= 5:
            summary_parts.append("sovuq")
            tips.append("Sovuq havo — moy yoki maska qo'llang.")
        else:
            summary_parts.append("mo'tadil")
    if humidity_pct is not None:
        if humidity_pct >= 75:
            summary_parts.append("namlik yuqori")
            tips.append("Yuqori namlik — frizz kamaytiruvchi serum.")
        elif humidity_pct <= 35:
            summary_parts.append("havo quruq")
            tips.append("Past namlik — leave-in yoki maska.")
    if wind_kmh is not None and wind_kmh >= 25:
        tips.append("Shamol kuchli — sochni bog'lab yuring.")
    if condition_key in ("rain", "showers", "drizzle", "storm"):
        tips.append("Yomg'ir — sochni quruq saqlang.")
    uv_lvl = _uv_level(uv_index)
    if uv_lvl in ("high", "very_high", "extreme"):
        tips.append(_uv_tip(uv_lvl))
    if condition == "oily":
        tips.append("Yog'li scalp — yengil shampun.")
    elif condition == "damaged":
        tips.append("Shikastlangan soch — tiklovchi maska.")
    if not tips:
        tips.append("Oddiy yuvish va namlantirish yetarli.")
    summary = ("Bugun havo " + ", ".join(summary_parts) if summary_parts else "Bugun ob-havo barqaror.") + ". Quyidagi parvarishga amal qiling."
    return summary, tips[:5]


def _product_advice(category: str, ctx: dict[str, Any]) -> tuple[str, str]:
    cat = (category or "other").lower()
    wet = ctx["condition_key"] in ("rain", "drizzle", "showers", "storm", "snow")
    dry = ctx["humidity"] is not None and ctx["humidity"] < 40
    humid = ctx["humidity"] is not None and ctx["humidity"] >= 65
    hot = ctx["temp"] is not None and ctx["temp"] >= 28
    uv_high = _uv_level(ctx.get("uv")) in ("high", "very_high", "extreme")
    if "shampoo" in cat or cat == "cleanser":
        if wet:
            return ("Bugun yuvishni o'tkazing yoki juda qisqa 1x.", "Yomg'irda ortiqcha yuvish zarar.")
        if dry:
            return ("Iliq suvda yumshoq yuving, oxiri salqin.", "Quruq havo scalpni quritadi.")
        if hot or humid:
            return ("Yengil miqdor — faqat ildiz.", "Issiq/nam kunda yog'lanish tez.")
        return ("Oddiy rejim: ildiz -> kopik -> yuvish.", "Muntazam yuvish yetarli.")
    if cat in ("balsam", "conditioner"):
        if dry:
            return ("Uchlarga qalinroq, 2-3 daqiqa.", "Namlik past — balsam muhim.")
        if humid:
            return ("Yengil qatlam, ildizga tegmang.", "Namlikda og'ir balsam frizz.")
        return ("Uchlarga 1 daqiqa ushlab yuving.", "Har yuvishda ishlating.")
    if cat == "mask":
        if dry or ctx.get("hair_condition") in ("dry", "damaged"):
            return ("Bugun kechqurun 10-15 daqiqa maska.", "Quruq havo / shikast — chuqur parvarish.")
        if wet:
            return ("Maskani ertaga qoldiring.", "Yomg'irda og'ir maska kerak emas.")
        return ("2-3 kunda bir marta yetarli.", "Haddan tashqari ishlatmang.")
    if cat in ("serum", "oil"):
        if uv_high:
            return ("Chiqishdan oldin yengil himoya / serum.", "UV dan sochni saqlang.")
        if dry:
            return ("Leave-in yoki 2 tomchi moy — uchlarga.", "Quruq havo uchun namlik.")
        if humid:
            return ("Tomchi serum, yog'ni kamaytiring.", "Namlikda og'ir moy yomon.")
        return ("Uchlarga ozgina.", "Kundalik himoya.")
    if cat == "spray":
        if wet or uv_high:
            return ("Chiqishdan oldin himoya sprey.", "Yomg'ir/UV uchun to'siq.")
        if dry:
            return ("Kun davomida 1-2 marta sprey.", "Namlikni ushlab turadi.")
        return ("Kerak bo'lsa yengil mist.", "Ortiqcha qilmang.")
    return ("Ob-havoga qarab odatiy miqdorda.", "Mahsulot yorlig'iga amal qiling.")


def _plan_priority(category: str, ctx: dict[str, Any]) -> int:
    cat = (category or "").lower()
    wet = ctx["condition_key"] in ("rain", "drizzle", "showers", "storm")
    dry = ctx["humidity"] is not None and ctx["humidity"] < 40
    uv_high = _uv_level(ctx.get("uv")) in ("high", "very_high", "extreme")
    if wet and ("spray" in cat or "serum" in cat):
        return 0
    if uv_high and ("spray" in cat or "oil" in cat or "serum" in cat):
        return 0
    if dry and ("mask" in cat or "oil" in cat or "serum" in cat):
        return 1
    if "shampoo" in cat:
        return 2 if not wet else 5
    return 3


def build_product_plan(products: list[dict[str, Any]], *, temp_c: float | None, humidity_pct: float | None, condition_key: str, uv_index: float | None, hair_condition: str = "") -> list[dict[str, Any]]:
    ctx = {"temp": temp_c, "humidity": humidity_pct, "condition_key": condition_key, "uv": uv_index, "hair_condition": hair_condition}
    out: list[dict[str, Any]] = []
    for p in products[:8]:
        if not isinstance(p, dict):
            continue
        name = str(p.get("name") or "").strip()
        if not name:
            continue
        category = str(p.get("category") or "other")
        how, tip = _product_advice(category, ctx)
        usage = str(p.get("usage_uz") or "").strip()
        if usage:
            how = f"{how} · {usage[:120]}"
        out.append({
            "product_id": p.get("id"),
            "name": name,
            "brand": str(p.get("brand") or ""),
            "category": category,
            "image_url": p.get("image_url"),
            "how_to_use": how,
            "tip": tip,
            "priority": _plan_priority(category, ctx),
        })
    out.sort(key=lambda r: r["priority"])
    return out


def _parse_hourly(raw: dict[str, Any], limit: int = 8) -> list[dict[str, Any]]:
    hourly = raw.get("hourly") or {}
    times = hourly.get("time") or []
    temps = hourly.get("temperature_2m") or []
    codes = hourly.get("weather_code") or []
    winds = hourly.get("wind_speed_10m") or []
    pops = hourly.get("precipitation_probability") or []
    uvs = hourly.get("uv_index") or []
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    out: list[dict[str, Any]] = []
    for idx, iso in enumerate(times):
        try:
            ts = datetime.fromisoformat(str(iso))
        except ValueError:
            continue
        if ts < now:
            continue
        code = codes[idx] if idx < len(codes) else None
        out.append({
            "time": ts.strftime("%H:%M"),
            "hour": ts.hour,
            "temperature_c": temps[idx] if idx < len(temps) else None,
            "weather_code": code,
            "condition_key": _condition_key(code),
            "wind_kmh": winds[idx] if idx < len(winds) else None,
            "precip_probability": pops[idx] if idx < len(pops) else None,
            "uv_index": uvs[idx] if idx < len(uvs) else None,
        })
        if len(out) >= limit:
            break
    return out


def _hourly_highlight(hours: list[dict[str, Any]]) -> str | None:
    if not hours:
        return None
    evening = [h for h in hours if 17 <= int(h.get("hour") or 0) <= 21]
    pool = evening or hours
    windy = max(pool, key=lambda h: float(h.get("wind_kmh") or 0))
    rainy = max(pool, key=lambda h: float(h.get("precip_probability") or 0))
    if float(rainy.get("precip_probability") or 0) >= 50:
        return f"Kechqurun ({rainy['time']}) yomg'ir ehtimoli yuqori — himoya sprey oling."
    if float(windy.get("wind_kmh") or 0) >= 25:
        return f"Kechqurun ({windy['time']}) shamol kuchayadi — sochni bog'lab yuring."
    uv = max(hours[:6], key=lambda h: float(h.get("uv_index") or 0))
    if float(uv.get("uv_index") or 0) >= 6:
        return f"Tushga yaqin UV yuqori ({uv['time']}) — SPF / shlyapa."
    return None


def tomorrow_alert_message(days: list[dict[str, Any]]) -> dict[str, str] | None:
    if len(days) < 2:
        return None
    today_idx = next((i for i, d in enumerate(days) if d.get("is_today")), 0)
    nxt = days[today_idx + 1] if today_idx + 1 < len(days) else None
    if not nxt:
        return None
    key = nxt.get("condition_key") or "unknown"
    tmin = nxt.get("temperature_min_c")
    tmax = nxt.get("temperature_max_c")
    if key in ("rain", "showers", "drizzle", "storm"):
        return {"title": "Ertaga yomg'ir kutiladi", "body": "Sochni himoya qiling — leave-in/sprey, og'ir stylingni kamaytiring.", "kind": "rain"}
    if key in ("clear", "mainly_clear") and tmax is not None and float(tmax) >= 30:
        return {"title": "Ertaga quruq-issiq kun", "body": "Leave-in va UV himoya — sochni quyoshda quritmang.", "kind": "dry_hot"}
    if tmin is not None and float(tmin) <= 2:
        return {"title": "Ertaga sovuq", "body": "Quruqlikdan saqlang — kechqurun moy/maska foydali.", "kind": "cold"}
    return None


def build_weather_care_payload(*, lat: float | None = None, lon: float | None = None, condition: str = "", texture: str = "", region_id: str | None = None, region_label_override: str | None = None, products: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    resolved = resolve_region_coords(region_id)
    if resolved:
        safe_lat, safe_lon, region_label = resolved
        forced_region = region_label_override or region_label
    else:
        safe_lat = lat if lat is not None and -90 <= lat <= 90 else DEFAULT_LAT
        safe_lon = lon if lon is not None and -180 <= lon <= 180 else DEFAULT_LON
        forced_region = region_label_override

    try:
        raw = _fetch_open_meteo(safe_lat, safe_lon)
    except (urllib.error.URLError, TimeoutError, ValueError, OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Ob-havo ma'lumotini olishda xatolik.") from exc

    current = raw.get("current") or {}
    daily = raw.get("daily") or {}
    dates = daily.get("time") or []
    code_list = daily.get("weather_code") or []
    max_list = daily.get("temperature_2m_max") or []
    min_list = daily.get("temperature_2m_min") or []
    uv_daily = daily.get("uv_index_max") or []

    today_iso = date.today().isoformat()
    if dates and today_iso not in dates:
        today_iso = dates[0]

    current_code = current.get("weather_code")
    current_key = _condition_key(current_code)
    temp_c = current.get("temperature_2m")
    humidity = current.get("relative_humidity_2m")
    wind = current.get("wind_speed_10m")
    uv_now = current.get("uv_index")
    if uv_now is None and uv_daily:
        uv_now = uv_daily[0]

    uv_val = float(uv_now) if isinstance(uv_now, (int, float)) else None
    summary, recommendations = _hair_recommendations(
        temp_c=temp_c, humidity_pct=humidity, wind_kmh=wind, condition_key=current_key,
        uv_index=uv_val, condition=condition, texture=texture,
    )

    days: list[dict[str, Any]] = []
    for idx, iso_day in enumerate(dates[:3]):
        code = code_list[idx] if idx < len(code_list) else None
        days.append({
            "date": iso_day,
            "weekday_key": _weekday_key(iso_day),
            "is_today": iso_day == today_iso,
            "temperature_max_c": max_list[idx] if idx < len(max_list) else None,
            "temperature_min_c": min_list[idx] if idx < len(min_list) else None,
            "weather_code": code,
            "condition_key": _condition_key(code),
            "uv_index_max": uv_daily[idx] if idx < len(uv_daily) else None,
        })

    hours = _parse_hourly(raw, limit=8)
    uv_lvl = _uv_level(uv_val)
    primary = _primary_action(
        condition_key=current_key, temp_c=temp_c, humidity_pct=humidity,
        wind_kmh=wind, uv_index=uv_val, hair_condition=condition,
    )
    product_plan = build_product_plan(
        products or [], temp_c=temp_c, humidity_pct=humidity,
        condition_key=current_key, uv_index=uv_val, hair_condition=condition,
    )

    if forced_region:
        geo = {"location_label": forced_region, "location_place": forced_region, "location_region": forced_region}
    else:
        geo = _reverse_geocode(safe_lat, safe_lon)

    return {
        "location_label": geo["location_label"],
        "location_place": geo["location_place"],
        "location_region": geo["location_region"],
        "region_id": region_id,
        "latitude": safe_lat,
        "longitude": safe_lon,
        "current": {
            "temperature_c": temp_c,
            "humidity_pct": humidity,
            "wind_kmh": wind,
            "weather_code": current_code,
            "condition_key": current_key,
            "uv_index": uv_val,
        },
        "uv": {"index": uv_val, "level": uv_lvl, "tip": _uv_tip(uv_lvl)},
        "hours": hours,
        "hourly_highlight": _hourly_highlight(hours),
        "primary_action": primary,
        "product_plan": product_plan,
        "days": days,
        "summary": summary,
        "recommendations": recommendations,
        "tomorrow_alert": tomorrow_alert_message(days),
    }
