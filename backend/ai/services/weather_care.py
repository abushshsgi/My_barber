"""Ob-havo va soch parvarishi tavsiyalari (Open-Meteo)."""

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
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min",
            "forecast_days": 7,
            "timezone": "auto",
        }
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _reverse_geocode(lat: float, lon: float) -> str:
    params = urllib.parse.urlencode(
        {
            "latitude": f"{lat:.4f}",
            "longitude": f"{lon:.4f}",
            "count": "1",
            "language": "uz",
            "format": "json",
        }
    )
    url = f"https://geocoding-api.open-meteo.com/v1/reverse?{params}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        results = data.get("results") or []
        if results:
            row = results[0]
            return (
                row.get("name")
                or row.get("admin1")
                or row.get("country")
                or ""
            ).strip()
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        pass
    return ""


def _hair_recommendations(
    *,
    temp_c: float | None,
    humidity_pct: float | None,
    wind_kmh: float | None,
    condition_key: str,
    condition: str = "",
    texture: str = "",
) -> tuple[str, list[str]]:
    tips: list[str] = []
    summary_parts: list[str] = []

    if temp_c is not None:
        if temp_c >= 32:
            summary_parts.append("juda issiq")
            tips.append("Issiq havo — yengil sprey va UV himoya ishlating.")
            tips.append("Sochni yig‘ib yurish yoki bosh kiyim kiyish foydali.")
        elif temp_c >= 24:
            summary_parts.append("iliq")
            tips.append("Iliq havo — namlikni saqlash uchun engil konditsioner yetarli.")
        elif temp_c <= 5:
            summary_parts.append("sovuq")
            tips.append("Sovuq havo — quruqlikni oldini olish uchun moy yoki maska qo‘llang.")
        else:
            summary_parts.append("mo‘tadil")

    if humidity_pct is not None:
        if humidity_pct >= 75:
            summary_parts.append("namlik yuqori")
            tips.append("Yuqori namlik — frizz kamaytiruvchi serum va yengil mahsulotlar tanlang.")
            if texture == "curly":
                tips.append("Jingalak sochlar uchun gel-krem aralashtirmasdan, krem asosiy qiling.")
        elif humidity_pct <= 35:
            summary_parts.append("havo quruq")
            tips.append("Past namlik — chuqur namlantirish (maska yoki leave-in) tavsiya etiladi.")
            if condition in ("dry", "damaged"):
                tips.append("Quruq/shikastlangan sochlar uchun kechqurun moy bilan massaj qiling.")

    if wind_kmh is not None and wind_kmh >= 25:
        tips.append("Shamol kuchli — sochni bog‘lab yurish yoki sharf bilan himoya qiling.")

    if condition_key in ("rain", "showers", "drizzle", "storm"):
        tips.append("Yomg‘ir — sochni quruq saqlang, styling vositalarini kamaytiring.")
        tips.append("Chiqishdan oldin himoya spreyi yoki yengil moy qo‘llang.")
    elif condition_key in ("clear", "mainly_clear") and temp_c is not None and temp_c >= 26:
        tips.append("Quyosh — ochiq havoda UV himoya spreyi ishlating.")

    if condition == "oily":
        tips.append("Yog‘li scalp — yengil, sulfatsiz shampun va faqat uchlarga konditsioner.")
    elif condition == "damaged":
        tips.append("Shikastlangan soch — haftada bir marta tiklovchi maska qo‘shing.")

    if not tips:
        tips.append("Bugungi ob-havo uchun oddiy yuvish va namlantirish rejasi yetarli.")

    summary = "Bugun havo " + ", ".join(summary_parts) if summary_parts else "Bugun ob-havo barqaror."
    summary += ". Quyidagi parvarish tavsiyalariga amal qiling."

    return summary, tips[:5]


def build_weather_care_payload(
    *,
    lat: float | None = None,
    lon: float | None = None,
    condition: str = "",
    texture: str = "",
) -> dict[str, Any]:
    safe_lat = lat if lat is not None and -90 <= lat <= 90 else DEFAULT_LAT
    safe_lon = lon if lon is not None and -180 <= lon <= 180 else DEFAULT_LON

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

    today_iso = date.today().isoformat()
    if dates and today_iso not in dates:
        today_iso = dates[0]

    current_code = current.get("weather_code")
    current_key = _condition_key(current_code)
    temp_c = current.get("temperature_2m")
    humidity = current.get("relative_humidity_2m")
    wind = current.get("wind_speed_10m")

    summary, recommendations = _hair_recommendations(
        temp_c=temp_c,
        humidity_pct=humidity,
        wind_kmh=wind,
        condition_key=current_key,
        condition=condition,
        texture=texture,
    )

    days: list[dict[str, Any]] = []
    for idx, iso_day in enumerate(dates[:7]):
        code = code_list[idx] if idx < len(code_list) else None
        days.append(
            {
                "date": iso_day,
                "weekday_key": _weekday_key(iso_day),
                "is_today": iso_day == today_iso,
                "temperature_max_c": max_list[idx] if idx < len(max_list) else None,
                "temperature_min_c": min_list[idx] if idx < len(min_list) else None,
                "weather_code": code,
                "condition_key": _condition_key(code),
            }
        )

    location_label = _reverse_geocode(safe_lat, safe_lon)

    return {
        "location_label": location_label,
        "latitude": safe_lat,
        "longitude": safe_lon,
        "current": {
            "temperature_c": temp_c,
            "humidity_pct": humidity,
            "wind_kmh": wind,
            "weather_code": current_code,
            "condition_key": current_key,
        },
        "days": days,
        "summary": summary,
        "recommendations": recommendations,
    }
