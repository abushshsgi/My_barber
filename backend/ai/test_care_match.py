from types import SimpleNamespace

from ai.services.care_match import (
    normalize_ingredient,
    overlap_ratio,
    parse_ingredients_text,
    score_against_hair,
    suitability_for_user,
    usage_steps_for,
)


def test_parse_and_normalize_ingredients():
    names = parse_ingredients_text("Aqua, Sodium Lauryl Sulfate; Dimethicone\nPanthenol")
    assert "Aqua" in names
    assert normalize_ingredient("Sodium Lauryl Sulfate") == "sls"
    assert normalize_ingredient("aqua") == "water"
    assert overlap_ratio({"water", "sls"}, {"water", "panthenol"}) == 0.5


def test_score_formaldehyde_is_dangerous():
    profile = SimpleNamespace(
        tag_set=lambda: {"dry", "straight", "bleached"},
        is_complete=True,
    )
    scored = score_against_hair(None, ["Water", "Formaldehyde"], profile, "")
    assert scored["verdict"] == "dangerous"
    assert scored["safety_score"] <= 28


def test_score_product_mismatch_is_bad():
    product = SimpleNamespace(
        suitable_for=["oily"],
        not_suitable_for=["bleached", "damaged"],
    )
    profile = SimpleNamespace(
        tag_set=lambda: {"damaged", "curly", "bleached"},
        is_complete=True,
    )
    scored = score_against_hair(
        product, ["Aqua", "Sodium Laureth Sulfate"], profile, "caution"
    )
    assert scored["verdict"] in {"bad", "dangerous"}
    assert "hair_type_mismatch" in scored["flags"]


def test_suitability_prefers_matching_scalp_and_concerns():
    product = SimpleNamespace(
        category="shampoo",
        suitable_for=["oily", "straight"],
        not_suitable_for=[],
        scalp_types=["oily"],
        concerns=["dandruff"],
        ingredients=["Aqua", "Piroctone Olamine"],
        ingredients_text="",
        usage_uz="Bosh terisini 2 daqiqa massaj qiling.",
        sort_order=1,
        name="Derma",
    )
    profile = SimpleNamespace(
        tag_set=lambda: {"oily", "straight", "natural"},
        is_complete=True,
        condition="oily",
        scalp="oily",
        concerns=["dandruff"],
        color_status="natural",
        texture="straight",
    )
    fit = suitability_for_user(product, profile)
    assert fit["match_percent"] >= 70
    assert fit["fit_verdict"] in {"good", "excellent"}
    assert any("kepek" in r.lower() or "dandruff" in r.lower() or "muammo" in r.lower() for r in fit["fit_reasons"])
    steps = usage_steps_for(product, profile)
    assert steps
    assert "ildiz" in steps[1]["desc"].lower() or "massaj" in steps[1]["desc"].lower()


def test_suitability_penalizes_mismatch():
    product = SimpleNamespace(
        category="oil",
        suitable_for=["dry"],
        not_suitable_for=["oily"],
        scalp_types=["dry"],
        concerns=["split_ends"],
        ingredients=["Mineral Oil", "Parfum"],
        ingredients_text="",
        usage_uz="",
        sort_order=1,
        name="Heavy oil",
    )
    profile = SimpleNamespace(
        tag_set=lambda: {"oily", "straight", "natural"},
        is_complete=True,
        condition="oily",
        scalp="oily",
        concerns=["dandruff"],
        color_status="natural",
        texture="straight",
    )
    fit = suitability_for_user(product, profile)
    assert fit["match_percent"] is not None
    assert fit["match_percent"] < 60
    assert fit["fit_verdict"] in {"ok", "poor"}


def _profile(**kwargs):
    tags = kwargs.pop("tags")
    return SimpleNamespace(tag_set=lambda: set(tags), is_complete=True, concerns=[], **kwargs)


def test_empty_formula_is_unread_not_a_fake_good_score():
    profile = _profile(
        tags={"dry", "straight", "bleached"},
        condition="dry",
        texture="straight",
        color_status="bleached",
        scalp="dry",
    )
    scored = score_against_hair(None, [], profile, "good")
    assert scored["readable"] is False
    assert scored["verdict"] == "unread"
    assert scored["safety_score"] == 0
    assert scored["hair_fit"]["overall"] is None
    assert scored["hair_fit"]["dimensions"] == []


def test_hair_fit_percents_follow_user_hair():
    harsh = ["Sodium Laureth Sulfate", "Sodium Lauryl Sulfate", "Alcohol Denat", "Parfum"]
    dry = _profile(
        tags={"dry", "curly", "bleached"},
        condition="dry",
        texture="curly",
        color_status="bleached",
        scalp="dry",
    )
    oily = _profile(
        tags={"oily", "straight", "natural"},
        condition="oily",
        texture="straight",
        color_status="natural",
        scalp="oily",
    )
    dry_fit = score_against_hair(None, harsh, dry, "good")
    oily_fit = score_against_hair(None, harsh, oily, "")
    assert dry_fit["readable"] is True
    assert oily_fit["readable"] is True
    assert dry_fit["hair_fit"]["overall"] < oily_fit["hair_fit"]["overall"]
    assert dry_fit["verdict"] != "good"

    dry_color = next(d for d in dry_fit["hair_fit"]["dimensions"] if d["key"] == "color")
    oily_color = next(d for d in oily_fit["hair_fit"]["dimensions"] if d["key"] == "color")
    assert dry_color["tag"] == "bleached"
    assert oily_color["tag"] == "natural"
    assert dry_color["percent"] < oily_color["percent"]

    repair = score_against_hair(
        None,
        ["Aqua", "Panthenol", "Glycerin", "Sodium Laureth Sulfate"],
        dry,
        "",
    )
    rows = {row["name"]: row for row in repair["hair_fit"]["ingredients"]}
    assert rows["Panthenol"]["percent"] > rows["Sodium Laureth Sulfate"]["percent"]
    assert rows["Aqua"]["tone"] == "neutral"
    assert rows["Aqua"]["percent"] is None
    assert "suv" in rows["Aqua"]["about_uz"].lower()
    assert rows["Sodium Laureth Sulfate"]["role_uz"]
    assert "ehtiyot" in rows["Sodium Laureth Sulfate"]["hair_uz"].lower()
