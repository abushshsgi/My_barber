"""Soch mahsuloti katalogi moslash va xavfsizlik balli."""

from __future__ import annotations

import re
from typing import Any, Iterable

from django.db.models import Q

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

# Soch o‘qi → shu holatga yordam beradigan / zararli kanonik moddalar.
_HELPS: dict[str, frozenset[str]] = {
    "dry": frozenset({"glycerin", "panthenol", "niacinamide", "fatty_alcohol", "btac", "heavy_oil"}),
    "damaged": frozenset({"glycerin", "panthenol", "niacinamide", "fatty_alcohol", "btac"}),
    "oily": frozenset({"bha", "sci", "niacinamide"}),
    "normal": frozenset({"glycerin", "panthenol"}),
    "bleached": frozenset({"glycerin", "panthenol", "niacinamide", "btac", "fatty_alcohol"}),
    "colored": frozenset({"glycerin", "panthenol", "niacinamide", "btac"}),
    "natural": frozenset({"glycerin", "panthenol"}),
    "fine": frozenset({"sci", "bha"}),
    "curly": frozenset({"glycerin", "panthenol", "btac", "fatty_alcohol"}),
    "wavy": frozenset({"glycerin", "panthenol", "btac"}),
    "straight": frozenset({"glycerin", "panthenol"}),
    "sensitive": frozenset({"panthenol", "glycerin", "btac"}),
}
_HURTS: dict[str, frozenset[str]] = {
    "dry": frozenset({"sls", "sles", "drying_alcohol", "formaldehyde"}),
    "damaged": frozenset({"sls", "sles", "drying_alcohol", "formaldehyde"}),
    "oily": frozenset({"heavy_oil", "silicone"}),
    "normal": frozenset({"formaldehyde"}),
    "bleached": frozenset({"sls", "sles", "drying_alcohol", "formaldehyde"}),
    "colored": frozenset({"sls", "sles", "drying_alcohol", "formaldehyde"}),
    "natural": frozenset({"formaldehyde"}),
    "fine": frozenset({"silicone", "heavy_oil"}),
    "curly": frozenset({"drying_alcohol", "sls", "sles"}),
    "wavy": frozenset({"drying_alcohol", "sls"}),
    "straight": frozenset({"formaldehyde"}),
    "sensitive": frozenset({"fragrance", "formaldehyde", "drying_alcohol", "sls", "sles", "paraben"}),
}
_KNOWN_ACTIVES = frozenset(
    {
        "formaldehyde",
        "sls",
        "sles",
        "silicone",
        "paraben",
        "drying_alcohol",
        "heavy_oil",
        "fragrance",
        "glycerin",
        "panthenol",
        "niacinamide",
        "fatty_alcohol",
        "btac",
        "bha",
        "sci",
    }
)

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


def _profile_tags(profile: HairCareProfile | None) -> set[str]:
    if profile is None:
        return set()
    tag_fn = getattr(profile, "tag_set", None)
    if not callable(tag_fn):
        return set()
    try:
        return {str(t) for t in tag_fn() if t}
    except TypeError:
        return set()


def _profile_axes(profile: HairCareProfile | None) -> dict[str, str]:
    tags = _profile_tags(profile)
    condition = str(getattr(profile, "condition", "") or "").strip().lower() if profile else ""
    texture = str(getattr(profile, "texture", "") or "").strip().lower() if profile else ""
    color = str(getattr(profile, "color_status", "") or "").strip().lower() if profile else ""
    if condition not in {"oily", "dry", "normal", "damaged"}:
        condition = next((t for t in ("oily", "dry", "damaged", "normal") if t in tags), "")
    if texture not in {"straight", "wavy", "curly", "fine"}:
        texture = next((t for t in ("straight", "wavy", "curly", "fine") if t in tags), "")
    if color not in {"natural", "colored", "bleached"}:
        color = next((t for t in ("natural", "colored", "bleached") if t in tags), "")
    scalp = inferred_scalp(profile)
    if not scalp and condition in SCALP_TAGS:
        scalp = condition
    return {
        "condition": condition,
        "texture": texture,
        "color": color,
        "scalp": scalp,
    }


def _formula_from_product(product: CareProduct | None) -> list[str]:
    if product is None:
        return []
    raw = getattr(product, "ingredients", None)
    if isinstance(raw, list) and raw:
        names = [str(item).strip() for item in raw if str(item).strip()]
        return names[:120]
    return parse_ingredients_text(str(getattr(product, "ingredients_text", "") or ""))


def _resolve_formula(
    ingredients: list[str],
    product: CareProduct | None,
) -> tuple[list[str], str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in ingredients or []:
        name = str(item or "").strip()
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        cleaned.append(name)
    if cleaned:
        return cleaned[:120], "scan"
    catalog = _formula_from_product(product)
    if catalog:
        return catalog, "catalog"
    return [], "none"


def _unread_score() -> dict[str, Any]:
    return {
        "verdict": "unread",
        "safety_score": 0,
        "flags": [],
        "good_flags": [],
        "bad_flags": [],
        "dangerous_flags": [],
        "readable": False,
        "ingredients_source": "none",
        "formula": [],
        "hair_fit": {
            "overall": None,
            "dimensions": [],
            "ingredients": [],
            "profile": {},
        },
    }


def _axis_percent(
    tag: str,
    product: CareProduct | None,
    ordered: list[str],
    *,
    scalp_mode: bool = False,
) -> int | None:
    if not tag:
        return None
    score = 64.0
    if product is not None and not scalp_mode:
        suitable = set(_as_tag_list(getattr(product, "suitable_for", None)))
        unsuitable = set(_as_tag_list(getattr(product, "not_suitable_for", None)))
        if tag in suitable:
            score += 22
        if tag in unsuitable:
            score -= 36
    if product is not None and scalp_mode:
        prod_scalp = {
            t for t in _as_tag_list(getattr(product, "scalp_types", None)) if t in SCALP_TAGS
        }
        if prod_scalp:
            score += 18 if tag in prod_scalp else -16
    help_w = 0.0
    hurt_w = 0.0
    for index, name in enumerate(ordered[:40]):
        canon = normalize_ingredient(name)
        if not canon:
            continue
        weight = 1.35 if index < 5 else 1.0 if index < 14 else 0.6
        if canon in _HELPS.get(tag, frozenset()):
            help_w += weight
        if canon in _HURTS.get(tag, frozenset()):
            hurt_w += weight
    score += min(20.0, help_w * 6.0)
    score -= min(46.0, hurt_w * 13.0)
    return max(0, min(100, int(round(score))))


def _ingredient_fit_row(name: str, axes: list[str]) -> dict[str, Any]:
    canon = normalize_ingredient(name)
    if not canon or canon not in _KNOWN_ACTIVES:
        return {"name": name, "percent": None, "tone": "neutral"}
    if canon in DANGEROUS_CANON:
        return {"name": name, "percent": 8, "tone": "bad"}
    helped = sum(1 for tag in axes if canon in _HELPS.get(tag, frozenset()))
    hurt = sum(1 for tag in axes if canon in _HURTS.get(tag, frozenset()))
    score = 70.0 + min(26, helped * 14) - min(56, hurt * 22)
    if helped == 0 and hurt == 0:
        score -= 8
    percent = max(0, min(100, int(round(score))))
    if percent >= 75:
        tone = "good"
    elif percent >= 50:
        tone = "caution"
    else:
        tone = "bad"
    return {"name": name, "percent": percent, "tone": tone}


def _build_hair_fit(
    product: CareProduct | None,
    ordered: list[str],
    profile: HairCareProfile | None,
    *,
    dangerous: bool,
) -> dict[str, Any]:
    axes = _profile_axes(profile)
    weights = (
        ("condition", axes["condition"], 0.40, False),
        ("color", axes["color"], 0.25, False),
        ("scalp", axes["scalp"], 0.20, True),
        ("texture", axes["texture"], 0.15, False),
    )
    dimensions: list[dict[str, Any]] = []
    acc = 0.0
    weight_sum = 0.0
    for key, tag, weight, scalp_mode in weights:
        percent = _axis_percent(tag, product, ordered, scalp_mode=scalp_mode)
        if percent is None:
            continue
        dimensions.append({"key": key, "tag": tag, "percent": percent})
        acc += percent * weight
        weight_sum += weight
    overall = int(round(acc / weight_sum)) if weight_sum else None
    if overall is not None and dangerous:
        overall = min(overall, 18)
    axis_tags = [tag for tag in axes.values() if tag]
    return {
        "overall": overall,
        "dimensions": dimensions,
        "ingredients": [_ingredient_fit_row(name, axis_tags) for name in ordered[:24]],
        "profile": {key: value for key, value in axes.items() if value},
    }


def score_against_hair(
    product: CareProduct | None,
    ingredients: list[str],
    profile: HairCareProfile | None,
    gemini_verdict_key: str = "",
) -> dict[str, Any]:
    formula, source = _resolve_formula(ingredients, product)
    if not formula:
        return _unread_score()

    tags = _profile_tags(profile)
    canon = normalize_set(formula)
    flags: list[str] = []
    good: list[str] = []
    bad: list[str] = []
    dangerous: list[str] = []

    if canon & DANGEROUS_CANON:
        dangerous.extend(sorted(canon & DANGEROUS_CANON))
        flags.append("formaldehyde_warning")
    if canon & SULFATE_CANON:
        flags.append("sulfate_warning")
        if "bleached" in tags or "damaged" in tags or "dry" in tags:
            bad.append("sulfate")
        elif "oily" in tags:
            good.append("sulfate")
    if canon & SILICONE_CANON:
        flags.append("silicone_warning")
        if "fine" in tags or "oily" in tags:
            bad.append("silicone")
    if canon & ALCOHOL_CANON:
        flags.append("alcohol_warning")
        if "dry" in tags or "damaged" in tags:
            bad.append("drying_alcohol")
    if canon & PARABEN_CANON:
        flags.append("paraben_warning")
    if canon & HEAVY_OIL_CANON:
        flags.append("heavy_oil_warning")
        if "oily" in tags:
            bad.append("heavy_oil")
        elif "dry" in tags:
            good.append("heavy_oil")

    misses: set[str] = set()
    if product is not None:
        unsuitable = set(_as_tag_list(getattr(product, "not_suitable_for", None)))
        misses = tags & unsuitable
        if misses:
            flags.append("hair_type_mismatch")

    hair_fit = _build_hair_fit(product, formula, profile, dangerous=bool(dangerous))
    overall = hair_fit.get("overall")
    if isinstance(overall, int):
        score = overall
    else:
        score = 12 if dangerous else 64

    gemini_key = (gemini_verdict_key or "").strip().lower()
    if gemini_key == "dangerous":
        score = min(score, 25)
    elif gemini_key == "bad":
        score = min(score, 45)
    if misses:
        score = min(score, 42)
    score = max(0, min(100, score))
    hair_fit["overall"] = score

    if dangerous or score <= 28:
        verdict = "dangerous"
    elif score < 48 or misses:
        verdict = "bad"
    elif score < 78:
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
        "readable": True,
        "ingredients_source": source,
        "formula": formula,
        "hair_fit": hair_fit,
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

    if scored.get("readable"):
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


def recommend_products(
    profile: HairCareProfile | None,
    *,
    limit: int = 40,
    audience: str | None = None,
) -> list[CareProduct]:
    qs = CareProduct.objects.filter(is_published=True)
    if audience in ("men", "women"):
        qs = qs.filter(
            Q(audience__in=[audience, "unisex"]) | Q(audience="")
        )
    products = list(qs.order_by("sort_order", "name")[:200])
    if not profile or not profile.is_complete:
        return products[:limit]
    ranked: list[tuple[int, CareProduct]] = []
    for product in products:
        fit = suitability_for_user(product, profile)
        ranked.append((int(fit.get("match_percent") or 0), product))
    ranked.sort(key=lambda row: (-row[0], row[1].sort_order, row[1].name))
    return [p for _, p in ranked[:limit]]
