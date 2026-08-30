from ai.services.barcode_country import detect_country_from_barcode, normalize_barcode
from ai.services.product_barcode_lookup import infer_category, parse_open_beauty_facts, parse_upcitemdb


def test_normalize_strips_non_digits():
    assert normalize_barcode(" 478-1234 567890 ") == "4781234567890"


def test_uzbekistan_prefix():
    hit = detect_country_from_barcode("4781234567890")
    assert hit["is_matched"] is True
    assert hit["country_name"] == "Uzbekistan"
    assert hit["prefix"] == "478"
    assert hit["isMatched"] is True


def test_usa_canada_range():
    hit = detect_country_from_barcode("012345678905")
    assert hit["is_matched"] is True
    assert hit["country_name"] == "USA/Canada"
    assert hit["prefix"] == "000-019"


def test_germany_range():
    hit = detect_country_from_barcode("4006381333931")
    assert hit["country_name"] == "Germany"
    assert hit["prefix"] == "400-440"


def test_russia_range():
    hit = detect_country_from_barcode("4600605026117")
    assert hit["country_name"] == "Russia"
    assert hit["prefix"] == "460-469"


def test_short_barcode_not_matched():
    hit = detect_country_from_barcode("47812")
    assert hit["is_matched"] is False
    assert hit["country_name"] == ""


def test_unknown_prefix_keeps_digits():
    hit = detect_country_from_barcode("9991234567890")
    assert hit["is_matched"] is False
    assert hit["prefix"] == "999"


def test_infer_category():
    assert infer_category("en:shampoos Hair Repair") == "shampoo"
    assert infer_category("Hair Conditioner") == "conditioner"
    assert infer_category("Night serum") == "serum"


def test_parse_open_beauty_facts():
    parsed = parse_open_beauty_facts(
        {
            "status": 1,
            "product": {
                "product_name": "Kerastase Genesis",
                "brands": "Kérastase",
                "ingredients_text": "Aqua, Glycerin, Sodium Laureth Sulfate",
                "image_front_url": "https://example.com/k.jpg",
                "categories_tags": ["en:shampoos"],
            },
        },
        "4781234567890",
    )
    assert parsed is not None
    assert parsed["name"] == "Kerastase Genesis"
    assert parsed["source"] == "open_beauty_facts"
    assert parsed["category"] == "shampoo"
    assert parsed["country_of_origin"] == "Uzbekistan"


def test_parse_upcitemdb():
    parsed = parse_upcitemdb(
        {
            "items": [
                {
                    "title": "Loreal Elvive",
                    "brand": "L'Oreal",
                    "images": ["https://example.com/l.jpg"],
                    "category": "Hair Conditioner",
                    "description": "not ingredients",
                }
            ]
        },
        "4006381333931",
    )
    assert parsed is not None
    assert parsed["source"] == "upcitemdb"
    assert parsed["category"] == "conditioner"
    assert parsed["country_of_origin"] == "Germany"
    assert parsed["ingredients_text"] == ""
