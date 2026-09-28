"""Soch profili + javondagi mahsulotlardan bir zumda aniq parvarish rejasi.

Gemini kutmasdan bir xil JSON sxema qaytaradi: ertalab, kechqurun, haftalik
qadamlar soat bilan, mahsulot nomi va id si bilan.
"""

from __future__ import annotations

from typing import Any

DAYS = ("Du", "Se", "Chor", "Pay", "Ju", "Shan", "Ya")

WASH_DAYS = {
    "oily": {"Du", "Chor", "Ju", "Ya"},
    "dry": {"Se", "Shan"},
    "damaged": {"Se", "Shan"},
    "normal": {"Du", "Pay", "Shan"},
}

CONDITION_FOCUS = {
    "oily": "ildizni yengil tozalash, uchlarni og'irlashtirmaslik",
    "dry": "namlikni ushlab qolish va kam yuvish",
    "damaged": "yuvishni kamaytirish, tiklovchi maska",
    "normal": "muvozanatli yuvish va yengil himoya",
}


def hair_profile_key(condition: str, texture: str, color_status: str) -> str:
    return f"{(condition or '').strip()}|{(texture or '').strip()}|{(color_status or '').strip()}"


def _clock(raw: str, fallback: str) -> str:
    s = str(raw or "").strip().replace(".", ":")
    parts = s.split(":")
    if len(parts) < 2:
        s = fallback
        parts = s.split(":")
    try:
        h = int(parts[0])
        m = int("".join(ch for ch in parts[1] if ch.isdigit())[:2] or "0")
    except ValueError:
        h, m = (int(x) for x in fallback.split(":"))
    h = min(23, max(0, h))
    m = min(59, max(0, m))
    return f"{h:02d}:{m:02d}"


def _add(clock: str, minutes: int) -> str:
    h, m = (int(x) for x in clock.split(":"))
    total = (h * 60 + m + minutes) % 1440
    return f"{total // 60:02d}:{total % 60:02d}"


def _cat(product: dict[str, Any]) -> str:
    raw = str(product.get("category") or "other").strip().lower()
    if raw in {"conditioner", "balzam"}:
        return "balsam"
    if raw in {"shampoo", "balsam", "mask", "serum", "oil", "spray", "other"}:
        return raw
    return "other"


def _how(product: dict[str, Any] | None, fallback: str) -> str:
    if not product:
        return fallback[:140]
    usage = str(product.get("usage_uz") or "").strip()
    if usage:
        return usage.split("\n")[0].strip()[:140]
    purpose = str(product.get("purpose_uz") or "").strip()
    if purpose:
        return purpose[:140]
    return fallback[:140]


def _best(products: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not products:
        return None

    def score(p: dict[str, Any]) -> int:
        raw = p.get("match_percent")
        try:
            return int(raw)
        except (TypeError, ValueError):
            return 0

    return max(products, key=score)


def _bucket(products: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for item in products:
        if not isinstance(item, dict):
            continue
        try:
            pid = int(item.get("id"))
        except (TypeError, ValueError):
            continue
        if pid <= 0:
            continue
        row = dict(item)
        row["id"] = pid
        row["name"] = str(item.get("name") or "").strip()[:80] or "Mahsulot"
        groups.setdefault(_cat(row), []).append(row)
    return groups


def _task(
    *,
    slot: str,
    idx: int,
    title: str,
    subtitle: str,
    clock: str,
    label: str,
    icon: str,
    duration: int,
    product: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "id": f"{slot[0]}{idx}",
        "title": title[:80],
        "subtitle": subtitle[:140],
        "time": clock,
        "time_hint": f"{clock} · {label}"[:60],
        "duration_min": duration,
        "icon": icon,
        "product_id": int(product["id"]) if product else None,
        "product_name": str(product["name"])[:80] if product else "",
    }


def _wash_phrase(condition: str) -> str:
    days = WASH_DAYS.get(condition, WASH_DAYS["normal"])
    ordered = [d for d in DAYS if d in days]
    return f"Yuvish {len(ordered)}×/hafta ({', '.join(ordered)})"


def compose_care_plan(
    *,
    condition: str,
    texture: str,
    color_status: str,
    products: list[dict[str, Any]],
    scalp: str = "",
    concerns: list[str] | None = None,
    gender: str = "",
    morning_time: str = "",
    evening_time: str = "",
) -> dict[str, Any]:
    cond = (condition or "normal").strip().lower()
    if cond not in WASH_DAYS:
        cond = "normal"
    color = (color_status or "natural").strip().lower()
    tex = (texture or "straight").strip().lower()
    morning = _clock(morning_time, "07:30")
    evening = _clock(evening_time, "21:00")
    groups = _bucket(products)
    used: set[int] = set()

    def take(cat: str) -> dict[str, Any] | None:
        picked = _best(groups.get(cat) or [])
        if not picked:
            return None
        used.add(int(picked["id"]))
        return picked

    shampoo = take("shampoo")
    balsam = take("balsam")
    spray = take("spray")
    serum = take("serum")
    oil = take("oil")
    mask = take("mask")

    shampoo_title = {
        "oily": "Ildizni tozalash",
        "dry": "Yumshoq yuvish",
        "damaged": "Tiklovchi yuvish",
        "normal": "Kundalik yuvish",
    }[cond]
    if color in {"colored", "bleached"}:
        shampoo_title = "Rangni asraydigan yuvish"

    morning_rows: list[dict[str, Any]] = []
    cursor = morning
    if shampoo:
        morning_rows.append(
            _task(
                slot="morning",
                idx=len(morning_rows) + 1,
                title=shampoo_title,
                subtitle=_how(shampoo, "Iliq suv, ildizga surting, uchlarga tegmang."),
                clock=cursor,
                label="Ertalab",
                icon="water",
                duration=4 if cond == "oily" else 5,
                product=shampoo,
            )
        )
        cursor = _add(cursor, 6)
    if balsam:
        morning_rows.append(
            _task(
                slot="morning",
                idx=len(morning_rows) + 1,
                title="Uchlarni yumshatish",
                subtitle=_how(balsam, "Yuvilgan soch uchlariga 2–3 daqiqa qoldiring."),
                clock=cursor,
                label="Yuvishdan keyin",
                icon="flask",
                duration=3,
                product=balsam,
            )
        )
        cursor = _add(cursor, 5)
    if spray:
        morning_rows.append(
            _task(
                slot="morning",
                idx=len(morning_rows) + 1,
                title="Kunlik himoya",
                subtitle=_how(spray, "Quruq yoki nam sochga yengil purkang."),
                clock=cursor,
                label="Chiqishdan oldin",
                icon="shield",
                duration=1,
                product=spray,
            )
        )
        cursor = _add(cursor, 4)
    if not morning_rows:
        morning_rows.append(
            _task(
                slot="morning",
                idx=1,
                title="Ertalab yangilash",
                subtitle="Sovuq suv bilan ildizni chaying, issiq havo yo'q.",
                clock=morning,
                label="Ertalab",
                icon="water",
                duration=2,
                product=None,
            )
        )

    evening_rows: list[dict[str, Any]] = []
    cursor = evening
    if serum:
        evening_rows.append(
            _task(
                slot="evening",
                idx=len(evening_rows) + 1,
                title="Kechki serum",
                subtitle=_how(serum, "Nam uchlarga bir necha tomchi, tarang."),
                clock=cursor,
                label="Kechqurun",
                icon="sparkles",
                duration=2,
                product=serum,
            )
        )
        cursor = _add(cursor, 5)
    if oil:
        evening_rows.append(
            _task(
                slot="evening",
                idx=len(evening_rows) + 1,
                title="Yog' bilan himoya",
                subtitle=_how(oil, "Uchlarga no'xatdek, ildizga surtmang."),
                clock=cursor,
                label="Uxlamasdan oldin",
                icon="leaf",
                duration=3,
                product=oil,
            )
        )
        cursor = _add(cursor, 5)
    if not evening_rows:
        evening_rows.append(
            _task(
                slot="evening",
                idx=1,
                title="Kechki parvarish",
                subtitle="Sochni yumshoq sochiq bilan quriting, qattiq ishqalamang.",
                clock=evening,
                label="Kechqurun",
                icon="sparkles",
                duration=2,
                product=None,
            )
        )

    weekly_rows: list[dict[str, Any]] = []
    cursor = _add(evening, 8)
    if mask:
        weekly_rows.append(
            _task(
                slot="weekly",
                idx=1,
                title="Chuqur maska",
                subtitle=_how(mask, "Yuvish kunida 10 daqiqa qoldiring, keyin yuving."),
                clock=cursor,
                label="Haftada 1×",
                icon="flask",
                duration=12,
                product=mask,
            )
        )
        cursor = _add(cursor, 15)
    weekly_rows.append(
        _task(
            slot="weekly",
            idx=len(weekly_rows) + 1,
            title="Bosh terisi massaji",
            subtitle=(
                "Yog'li ildizni qattiq ishqalamang, barmoq uchlari bilan 2 daqiqa."
                if cond == "oily"
                else "Quruq bosh terisini yumshoq aylana bilan massaj qiling."
            ),
            clock=cursor,
            label="Haftada 1×",
            icon="water",
            duration=3,
            product=None,
        )
    )
    cursor = _add(cursor, 8)
    trim_title = "Uchlar va kontur" if (gender or "").strip().lower() == "male" else "Uchlarni tekshirish"
    weekly_rows.append(
        _task(
            slot="weekly",
            idx=len(weekly_rows) + 1,
            title=trim_title,
            subtitle="Ajralgan uchlarni ko'zdan kechiring, har hafta kesmang.",
            clock=cursor,
            label="Yakshanba",
            icon="cut",
            duration=4,
            product=None,
        )
    )

    leftovers: list[dict[str, Any]] = []
    for rows in groups.values():
        for row in rows:
            if int(row["id"]) not in used:
                leftovers.append(row)
    leftovers.sort(key=lambda p: str(p.get("name") or ""))
    for extra in leftovers[:2]:
        used.add(int(extra["id"]))
        weekly_rows.append(
            _task(
                slot="weekly",
                idx=len(weekly_rows) + 1,
                title=str(extra["name"])[:48],
                subtitle=_how(extra, "Haftada 1–2 marta, ko'rsatmaga qarab."),
                clock=_add(evening, 20 + 6 * len(weekly_rows)),
                label="Qo'shimcha",
                icon="sparkles",
                duration=5,
                product=extra,
            )
        )

    leave = oil or serum or spray or balsam
    wash_days = WASH_DAYS[cond]
    schedule: list[dict[str, Any]] = []
    for day in DAYS:
        if day in wash_days and shampoo:
            schedule.append(
                {
                    "day": day,
                    "time": morning,
                    "task": f"{shampoo['name']} bilan yuvish",
                    "product_id": int(shampoo["id"]),
                    "product_name": shampoo["name"],
                }
            )
        elif leave:
            schedule.append(
                {
                    "day": day,
                    "time": evening,
                    "task": f"{leave['name']} bilan yengil parvarish",
                    "product_id": int(leave["id"]),
                    "product_name": leave["name"],
                }
            )
        else:
            schedule.append(
                {
                    "day": day,
                    "time": evening,
                    "task": "Suv bilan yangilash, issiq fen yo'q",
                    "product_id": None,
                    "product_name": "",
                }
            )

    seen_names: list[str] = []
    for row in (*morning_rows, *evening_rows, *weekly_rows):
        name = str(row.get("product_name") or "").strip()
        if name and name not in seen_names:
            seen_names.append(name)
    names = seen_names[:4]
    focus = CONDITION_FOCUS[cond]
    if scalp:
        focus = f"{focus}, bosh terisi {scalp}"
    summary = f"{_wash_phrase(cond)}. {focus.capitalize()}."
    if names:
        summary = f"{summary} Mahsulotlar: {', '.join(names)}."
    if color in {"colored", "bleached"}:
        summary = f"{summary} Rangni saqlash uchun sulfatsiz yuvish."

    tips = [
        f"Ertalabki birinchi qadam {morning} da, kechki {evening} da.",
        "Yuvish kunidan boshqa kunlarda shampunni qaytarmang.",
    ]
    if tex == "curly":
        tips.append("Jingalak sochni ho'l holda tarang, quruq holda cho'tka qilmang.")
    elif tex == "wavy":
        tips.append("To'lqinni fen bilan cho'zmang, havoda quriting.")
    else:
        tips.append("Ildizni qurutib, uchlarni sal nam qoldiring.")
    if concerns:
        tips.append(f"E'tibor: {', '.join(str(c) for c in concerns[:3])}.")

    avoid = [
        "Har kuni issiq fen va dazmol.",
        "Ildizga og'ir yog' surtish." if cond == "oily" else "Quruq sochni sulfatli shampun bilan har kuni yuvish.",
    ]
    if color in {"colored", "bleached"}:
        avoid.append("Rangni ochadigan sulfat va qattiq issiqlik.")
    else:
        avoid.append("Mahsulotni ko'rsatmadan ko'p qo'yish.")

    slot_of: dict[int, str] = {}
    for slot, rows in (("morning", morning_rows), ("evening", evening_rows), ("weekly", weekly_rows)):
        for row in rows:
            pid = row.get("product_id")
            if isinstance(pid, int) and pid not in slot_of:
                slot_of[pid] = slot

    analyses: list[dict[str, Any]] = []
    for cat_rows in groups.values():
        for product in cat_rows:
            pid = int(product["id"])
            reasons = product.get("fit_reasons") if isinstance(product.get("fit_reasons"), list) else []
            analyses.append(
                {
                    "product_id": pid,
                    "name": product["name"],
                    "category": _cat(product),
                    "match_percent": product.get("match_percent"),
                    "fit_reasons": [str(x)[:160] for x in reasons[:4]],
                    "usage": str(product.get("usage_uz") or product.get("purpose_uz") or "")[:240],
                    "slot": slot_of.get(pid, ""),
                }
            )

    return {
        "summary": summary[:280],
        "morning": morning_rows[:5],
        "evening": evening_rows[:5],
        "weekly": weekly_rows[:4],
        "weekly_schedule": schedule,
        "tips": tips[:4],
        "avoid": avoid[:4],
        "_analyses": analyses,
    }
