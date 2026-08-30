from ai.services.gemini_care_catalog import normalize_catalog_fill


def test_normalize_catalog_fill_maps_aliases_and_tags():
    filled = normalize_catalog_fill(
        {
            "name": "  Repair Shampoo  ",
            "brand": "Loreal",
            "category": "shampun",
            "barcode": "478-1234 567890",
            "ingredients": ["Aqua", "Glycerin", ""],
            "suitable_for": ["oily", "unknown", "dry"],
            "not_suitable_for": "bleached",
            "scalp_types": ["sensitive", "hot"],
            "concerns": ["dandruff", "noise"],
            "usage_uz": "Yuving.",
        }
    )
    assert filled["name"] == "Repair Shampoo"
    assert filled["category"] == "shampoo"
    assert filled["barcode"] == "4781234567890"
    assert "Aqua" in filled["ingredients"]
    assert filled["suitable_for"] == ["oily", "dry"]
    assert filled["not_suitable_for"] == ["bleached"]
    assert filled["scalp_types"] == ["sensitive"]
    assert filled["concerns"] == ["dandruff"]
    assert filled["usage_uz"] == "Yuving."


def test_normalize_catalog_fill_empty_stays_safe():
    filled = normalize_catalog_fill({})
    assert filled["name"] == ""
    assert filled["category"] == "other"
    assert filled["ingredients"] == []
    assert filled["suitable_for"] == []
    assert filled["image_roles"] == []


def test_normalize_catalog_fill_image_roles():
    filled = normalize_catalog_fill(
        {"image_roles": ["Oldi", "orqa", "inci"]},
        photo_count=3,
    )
    assert filled["image_roles"] == ["front", "back", "ingredients"]
    bad = normalize_catalog_fill({"image_roles": ["front", "box"]}, photo_count=2)
    assert bad["image_roles"] == []
