"""Soch mahsuloti katalogi moslash va xavfsizlik balli."""

from __future__ import annotations

import re
from typing import Any, Iterable

from ai.models import CareProduct, HairCareProfile

HAIR_TAGS = frozenset(
    {
        "oily",
        "dry",
        "normal",
        "damaged",
        "fine",
        "straight",
        "wavy",
        "curly",
        "natural",
        "colored",
        "bleached",
    }
)
SCALP_TAGS = frozenset({"oily", "dry", "normal", "sensitive"})
CONCERN_TAGS = frozenset(
    {
        "dandruff",
        "hair_loss",
        "frizz",
        "breakage",
        "color_fade",
        "itch",
        "split_ends",
    }
)

TAG_LABEL_UZ = {
    "oily": "yog'li",
    "dry": "quruq",
    "normal": "normal",
    "damaged": "shikastlangan",
    "fine": "ingichka",
    "straight": "to'g'ri",
    "wavy": "to'lqinsimon",
    "curly": "jingalak",
    "natural": "tabiiy",
    "colored": "bo'yalgan",
    "bleached": "ochilgan",
    "sensitive": "sezgir",
    "dandruff": "kepek",
    "hair_loss": "soch to'kilishi",
    "frizz": "shishish",
    "breakage": "sinish",
    "color_fade": "rang oqishi",
    "itch": "qichishish",
    "split_ends": "yorilgan uchlar",
}

INGREDIENT_ALIASES: dict[str, str] = {
    "aqua": "water",
    "eau": "water",
    "sodium lauryl sulfate": "sls",
    "sodium laureth sulfate": "sles",
    "sodium lauryl sulphate": "sls",
    "sodium laureth sulphate": "sles",
    "parfum": "fragrance",
    "fragrance": "fragrance",
    "dimethicone": "silicone",
    "cyclomethicone": "silicone",
    "amodimethicone": "silicone",
    "cyclopentasiloxane": "silicone",
    "formaldehyde": "formaldehyde",
    "dmdm hydantoin": "formaldehyde",
    "imidazolidinyl urea": "formaldehyde",
    "diazolidinyl urea": "formaldehyde",
    "quaternium-15": "formaldehyde",
    "methylparaben": "paraben",
    "propylparaben": "paraben",
    "butylparaben": "paraben",
    "ethylparaben": "paraben",
    "isopropyl alcohol": "drying_alcohol",
    "alcohol denat": "drying_alcohol",
    "sd alcohol": "drying_alcohol",
    "mineral oil": "heavy_oil",
    "petrolatum": "heavy_oil",

    "tea tree oil": "melaleuca",
    "melaleuca alternifolia": "melaleuca",
    "cocamidopropyl betaine": "capb",
    "sodium cocoyl isethionate": "sci",
    "behentrimonium chloride": "btac",
    "cetyl alcohol": "fatty_alcohol",
    "cetearyl alcohol": "fatty_alcohol",
    "stearyl alcohol": "fatty_alcohol",
    "glycerin": "glycerin",
    "glycerine": "glycerin",
    "panthenol": "panthenol",
    "niacinamide": "niacinamide",
    "salicylic acid": "bha",
    "benzyl alcohol": "preservative_alcohol",
}

DANGEROUS_CANON = frozenset({"formaldehyde"})
SULFATE_CANON = frozenset({"sls", "sles"})
SILICONE_CANON = frozenset({"silicone"})
PARABEN_CANON = frozenset({"paraben"})
ALCOHOL_CANON = frozenset({"drying_alcohol"})
HEAVY_OIL_CANON = frozenset({"heavy_oil"})

_SPLIT_RE = re.compile(r"[,;\n]+")
_NON_ALNUM = re.compile(r"[^a-z0-9+\- ]+")


def parse_ingredients_text(text: str) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw in _SPLIT_RE.split(text or ""):
        name = " ".join(raw.strip().split())
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(name)
    return out[:120]


def normalize_ingredient(name: str) -> str:
    cleaned = _NON_ALNUM.sub(" ", (name or "").lower())
    cleaned = " ".join(cleaned.split())
    if not cleaned:
        return ""
    return INGREDIENT_ALIASES.get(cleaned, cleaned)


def normalize_set(names: Iterable[str]) -> set[str]:
    out: set[str] = set()
    for name in names:
        key = normalize_ingredient(str(name))
        if key:
            out.add(key)
    return out


def overlap_ratio(a: set[str], b: set[str]) -> float:
    """Dice + Jaccard aralashmasi — qisqa INCI ro'yxatlarida barqarorroq."""
    if not a or not b:
        return 0.0
    inter = len(a & b)
    if inter == 0:
        return 0.0
    dice = (2.0 * inter) / (len(a) + len(b))
    jaccard = inter / len(a | b)
    return max(dice, jaccard)


def _as_tag_list(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        tag = str(item or "").strip().lower()
        if tag and tag not in out:
            out.append(tag)
    return out


def match_care_product(
    *,
    product_name: str,
    brand: str,
    ingredients: list[str],
) -> tuple[CareProduct | None, float]:
    qs = CareProduct.objects.filter(is_published=True)
    extracted = normalize_set(ingredients)
    name_q = (product_name or "").strip()
    brand_q = (brand or "").strip()

    best: CareProduct | None = None
    best_score = 0.0

    candidates = list(qs[:400])
    if name_q or brand_q:
        named = qs.none()
        if name_q:
            named = named | qs.filter(name__icontains=name_q)
        if brand_q:
            named = named | qs.filter(brand__icontains=brand_q)
            named = named | qs.filter(name__icontains=brand_q)
        named_list = list(named[:80])
        if named_list:
            candidates = named_list + [p for p in candidates if p.pk not in {x.pk for x in named_list}]

    for product in candidates:
        score = 0.0
        prod_name = product.name.lower()
        prod_brand = (product.brand or "").lower()
        if name_q and name_q.lower() in prod_name:
            score += 0.55
        elif name_q and prod_name and prod_name in name_q.lower():
            score += 0.4
        if brand_q and brand_q.lower() in prod_brand:
            score += 0.25
        # Nom tokenlari bo‘yicha qo‘shimcha ball
        if name_q:
            name_tokens = {t for t in name_q.lower().split() if len(t) > 2}
            prod_tokens = {t for t in prod_name.split() if len(t) > 2}
            shared = name_tokens & prod_tokens
            if shared:
                score += min(0.35, 0.12 * len(shared))
        catalog_ings = normalize_set(
            product.ingredients if isinstance(product.ingredients, list) else []
        )
        overlap = overlap_ratio(extracted, catalog_ings)
        if overlap >= 0.6:
            score += 0.5 + overlap * 0.3
        elif overlap >= 0.35:
            score += overlap * 0.4
        if score > best_score:
            best_score = score
            best = product

    if best is None or best_score < 0.38:
        return None, best_score
    return best, best_score


def score_against_hair(
    product: CareProduct | None,
    ingredients: list[str],
    profile: HairCareProfile | None,
    gemini_verdict_key: str = "",
) -> dict[str, Any]:
    tags = profile.tag_set() if profile else set()
    canon = normalize_set(ingredients)
    flags: list[str] = []
    good: list[str] = []
    bad: list[str] = []
    dangerous: list[str] = []
    score = 72

    if canon & DANGEROUS_CANON:
        dangerous.extend(sorted(canon & DANGEROUS_CANON))
        flags.append("formaldehyde_warning")
        score -= 55
    if canon & SULFATE_CANON:
        flags.append("sulfate_warning")
        if "bleached" in tags or "damaged" in tags or "dry" in tags:
            bad.append("sulfate")
            score -= 18
        elif "oily" in tags:
            good.append("sulfate")
            score += 4
        else:
            score -= 6
    if canon & SILICONE_CANON:
        flags.append("silicone_warning")
        if "fine" in tags or "oily" in tags:
            bad.append("silicone")
            score -= 8
        else:
            score -= 2
    if canon & ALCOHOL_CANON:
        flags.append("alcohol_warning")
        if "dry" in tags or "damaged" in tags:
            bad.append("drying_alcohol")
            score -= 12
        else:
            score -= 4
    if canon & PARABEN_CANON:
        flags.append("paraben_warning")
        score -= 6
    if canon & HEAVY_OIL_CANON:
        flags.append("heavy_oil_warning")
        if "oily" in tags:
            bad.append("heavy_oil")
            score -= 14
        elif "dry" in tags:
            good.append("heavy_oil")
            score += 4

    if product is not None:
        suitable = set(_as_tag_list(product.suitable_for))
        unsuitable = set(_as_tag_list(product.not_suitable_for))
        hits = tags & suitable
        misses = tags & unsuitable
        score += len(hits) * 8
        score -= len(misses) * 18
        if misses:
            flags.append("hair_type_mismatch")

    gemini_key = (gemini_verdict_key or "").strip().lower()
    if gemini_key == "dangerous":
        score = min(score, 25)
    elif gemini_key == "bad":
        score = min(score, 45)
    elif gemini_key == "good":
        score = max(score, 62)

    score = max(0, min(100, int(round(score))))
    if dangerous or score <= 28:
        verdict = "dangerous"
    elif score <= 48 or (tags and product and tags & set(_as_tag_list(product.not_suitable_for))):
        verdict = "bad"
    elif score <= 68 or flags:
        verdict = "caution"
    else:
        verdict = "good"

    return {
        "verdict": verdict,
        "safety_score": score,
        "flags": flags,
        "good_flags": good,
        "bad_flags": bad,
        "dangerous_flags": dangerous,
    }


def _labels(tags: Iterable[str]) -> str:
    names = [TAG_LABEL_UZ.get(t, t) for t in tags if t]
    return ", ".join(names)


def inferred_scalp(profile: HairCareProfile | None) -> str:
    if profile is None:
        return ""
    scalp = str(getattr(profile, "scalp", "") or "").strip().lower()
    if scalp in SCALP_TAGS:
        return scalp
    condition = str(getattr(profile, "condition", "") or "").strip().lower()
    if condition == "oily":
        return "oily"
    if condition in {"dry", "damaged"}:
        return "dry"
    if condition == "normal":
        return "normal"
    return ""


def profile_concerns(profile: HairCareProfile | None) -> set[str]:
    if profile is None:
        return set()
    raw = getattr(profile, "concerns", None)
    return {t for t in _as_tag_list(raw) if t in CONCERN_TAGS}


CATEGORY_USAGE: dict[str, list[dict[str, str]]] = {
    "shampoo": [
        {
            "title": "Iliq suv bilan ho'llash",
            "desc": "Sochni va bosh terisini iliq suv bilan namlang. Qaynoq suvdan saqlaning.",
            "icon": "water",
        },
        {
            "title": "Bosh terisiga massaj",
            "desc": "Oz miqdorda ko'pirtirib, barmoq uchlari bilan 1–2 daqiqa massaj qiling.",
            "icon": "flask",
        },
        {
            "title": "Yaxshilab chayish",
            "desc": "Qoldiq qolmaguncha iliq suvda yuving.",
            "icon": "sparkles",
        },
    ],
    "conditioner": [
        {
            "title": "Ortiqcha suvni siqish",
            "desc": "Shampundan keyin sochni sochiq bilan muloyim siqing.",
            "icon": "water",
        },
        {
            "title": "Uchlarga surtish",
            "desc": "Ildizdan 2–3 sm pastdan uchlargacha tekis taqsimlang.",
            "icon": "leaf",
        },
        {
            "title": "1–2 daqiqa ushlash",
            "desc": "So'ng iliq suvda yuving. Ildizga tegizmang.",
            "icon": "sparkles",
        },
    ],
    "serum": [
        {
            "title": "Nam yoki quruq sochga",
            "desc": "2–3 tomchi oling — avval kaftlarda isiting.",
            "icon": "flask",
        },
        {
            "title": "Uchlardan o‘rta qismgacha",
            "desc": "Ildizga tegizmasdan tekis taqsimlang.",
            "icon": "leaf",
        },
    ],
    "balsam": [
        {
            "title": "Ortiqcha suvni siqish",
            "desc": "Shampundan keyin sochni sochiq bilan muloyim siqing.",
            "icon": "water",
        },
        {
            "title": "Uchlarga surtish",
            "desc": "Ildizdan 2–3 sm pastdan uchlargacha tekis taqsimlang.",
            "icon": "leaf",
        },
        {
            "title": "1–2 daqiqa ushlash",
            "desc": "So'ng iliq suvda yuving. Ildizga tegizmang.",
            "icon": "sparkles",
        },
    ],
    "mask": [
        {
            "title": "Toza nam sochga surtish",
            "desc": "Yuvilgandan so'ng ildizdan biroz pastga surting.",
            "icon": "leaf",
        },
        {
            "title": "Vaqt bo'yicha kutish",
            "desc": "3–10 daqiqa ushlang (mahsulot yozuvi bo'yicha).",
            "icon": "sparkles",
        },
        {
            "title": "Iliq suvda yuvish",
            "desc": "Qoldiqsiz chaying.",
            "icon": "water",
        },
    ],
    "oil": [
        {
            "title": "Kaftlarda eritish",
            "desc": "1–2 tomchi oling, kaftlarda isiting.",
            "icon": "flask",
        },
        {
            "title": "Uchlarga taqsimlash",
            "desc": "O'rtadan uchlarga yengil surting. Ildizga tegizmang.",
            "icon": "leaf",
        },
        {
            "title": "Yuvilmaydi",
            "desc": "Styling yoki tungi parvarish sifatida qoldiring.",
            "icon": "sparkles",
        },
    ],
    "spray": [
        {
            "title": "Masofa",
            "desc": "Nam yoki quruq sochga 15–20 sm masofadan seping.",
            "icon": "sparkles",
        },
        {
            "title": "Tekis taqsimlash",
            "desc": "Qo'l yoki taroq bilan soch bo'ylab yoying.",
            "icon": "leaf",
        },
        {
            "title": "Kerak bo'lsa fen",
            "desc": "Issiqlik himoyasi bo'lsa, fen oldidan ishlating.",
            "icon": "shield",
        },
    ],
    "other": [
        {
            "title": "Oz miqdor",
            "desc": "Kaftga ozgina oling va sochga tekis surting.",
            "icon": "flask",
        },
        {
            "title": "Yo'riqnoma bo'yicha",
            "desc": "Mahsulot yozuvi va soch holatingizga qarab ushlang yoki yuving.",
            "icon": "sparkles",
        },
    ],
}


def usage_steps_for(
    product: CareProduct | None,
    profile: HairCareProfile | None,
) -> list[dict[str, str]]:
    cat = str(getattr(product, "category", "") or "other").strip().lower()
    steps = [dict(row) for row in CATEGORY_USAGE.get(cat, CATEGORY_USAGE["other"])]
    condition = str(getattr(profile, "condition", "") or "").strip().lower() if profile else ""
    color = str(getattr(profile, "color_status", "") or "").strip().lower() if profile else ""
    scalp = inferred_scalp(profile)

    if cat == "shampoo" and (condition == "oily" or scalp == "oily") and len(steps) > 1:
        steps[1]["desc"] = "Faqat ildiz va bosh terisini massaj qiling — uchlarga kam surting."
    elif cat == "shampoo" and condition in {"dry", "damaged"} and len(steps) > 1:
        steps[1]["desc"] = "Yumshoq massaj, iliq suv. Quruq sochni qattiq ishqalamang."
    if cat == "oil" and (condition == "oily" or scalp == "oily") and len(steps) > 1:
        steps[1]["desc"] = "Juda oz — faqat uchlar. Ildiz va bosh terisiga tegizmang."
    if color == "bleached" and cat in {"shampoo", "balsam", "conditioner", "mask"}:
        steps.append(
            {
                "title": "Ochilgan soch",
                "desc": "Sulfatsiz, color-safe rejim. Issiq suv va kuchli ishqalashdan saqlaning.",
                "icon": "shield",
            }
        )
    usage = str(getattr(product, "usage_uz", "") or "").strip()
    if usage and steps:
        idx = 1 if len(steps) > 1 else 0
        steps[idx]["desc"] = usage[:240]
    return steps[:4]


def suitability_for_user(
    product: CareProduct | None,
    profile: HairCareProfile | None,
) -> dict[str, Any]:
    steps = usage_steps_for(product, profile)
    if product is None:
        return {
            "match_percent": None,
            "fit_verdict": None,
            "fit_reasons": [],
            "usage_steps": steps,
        }
    ingredients = product.ingredients if isinstance(product.ingredients, list) else []
    if not ingredients:
        ingredients = parse_ingredients_text(str(getattr(product, "ingredients_text", "") or ""))

    scored = score_against_hair(product, ingredients, profile, "")
    if profile is None or not getattr(profile, "is_complete", False):
        return {
            "match_percent": None,
            "fit_verdict": None,
            "fit_reasons": [],
            "usage_steps": steps,
        }

    tags = profile.tag_set()
    suitable = set(_as_tag_list(product.suitable_for))
    unsuitable = set(_as_tag_list(product.not_suitable_for))
    hits = tags & suitable
    misses = tags & unsuitable
    score = 58
    reasons: list[str] = []

    score += len(hits) * 8
    score -= len(misses) * 18
    if hits:
        reasons.append(f"Soch holatingiz ({_labels(hits)}) uchun mos.")
    if misses:
        reasons.append(f"Bu mahsulot {_labels(misses)} sochga tavsiya etilmaydi.")

    scalp = inferred_scalp(profile)
    prod_scalp = {t for t in _as_tag_list(getattr(product, "scalp_types", None)) if t in SCALP_TAGS}
    if scalp and prod_scalp:
        if scalp in prod_scalp:
            score += 10
            reasons.append(f"Bosh terisi ({TAG_LABEL_UZ.get(scalp, scalp)}) uchun mos.")
        else:
            score -= 10
            reasons.append(
                f"Bosh terisi {TAG_LABEL_UZ.get(scalp, scalp)} — mahsulot asosan "
                f"{_labels(prod_scalp)} teri uchun."
            )

    user_concerns = profile_concerns(profile)
    prod_concerns = {t for t in _as_tag_list(getattr(product, "concerns", None)) if t in CONCERN_TAGS}
    concern_hits = user_concerns & prod_concerns
    if concern_hits:
        score += len(concern_hits) * 9
        reasons.append(f"Muammolaringizga ishlaydi: {_labels(concern_hits)}.")

    score += int(round((scored["safety_score"] - 72) * 0.4))
    if "sulfate" in scored.get("bad_flags", []):
        reasons.append("Sulfatlar quruq yoki ochilgan sochni quritishi mumkin.")
    if "silicone" in scored.get("bad_flags", []):
        reasons.append("Silikon yupqa yoki yog'li sochni og'irlashtirishi mumkin.")
    if "drying_alcohol" in scored.get("bad_flags", []):
        reasons.append("Qurituvchi spirt namlikni kamaytirishi mumkin.")
    if "heavy_oil" in scored.get("good_flags", []):
        reasons.append("Og'ir yog'lar quruq soch uchlariga foydali.")
    if scored.get("dangerous_flags"):
        reasons.append("Xavfli konservant (masalan, formaldegid) aniqlandi.")

    percent = max(0, min(100, int(round(score))))
    if percent >= 82:
        verdict = "excellent"
    elif percent >= 68:
        verdict = "good"
    elif percent >= 50:
        verdict = "ok"
    else:
        verdict = "poor"

    if not reasons and percent >= 68:
        reasons.append("Tarkib va soch profilingiz umuman mos.")
    elif not reasons:
        reasons.append("Profilingiz bo'yicha o'rtacha moslik — ehtiyot bilan ishlating.")

    return {
        "match_percent": percent,
        "fit_verdict": verdict,
        "fit_reasons": reasons[:4],
        "usage_steps": steps,
    }


def recommend_products(profile: HairCareProfile | None, *, limit: int = 40) -> list[CareProduct]:
    qs = list(
        CareProduct.objects.filter(is_published=True).order_by("sort_order", "name")[:200]
    )
    if not profile or not profile.is_complete:
        return qs[:limit]
    ranked: list[tuple[int, CareProduct]] = []
    for product in qs:
        fit = suitability_for_user(product, profile)
        ranked.append((int(fit.get("match_percent") or 0), product))
    ranked.sort(key=lambda row: (-row[0], row[1].sort_order, row[1].name))
    return [p for _, p in ranked[:limit]]
