from types import SimpleNamespace

from ai.services.care_match import (
    normalize_ingredient,
    overlap_ratio,
    parse_ingredients_text,
    score_against_hair,
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
