from ai.services.care_plan_algo import care_plan_is_complete, compose_care_plan, hair_profile_key
from ai.services.gemini_care_plan import generate_care_plan


def test_compose_binds_products_and_clocks():
    plan = compose_care_plan(
        condition="dry",
        texture="wavy",
        color_status="colored",
        products=[
            {
                "id": 4,
                "name": "Длина Мечты",
                "category": "shampoo",
                "usage_uz": "Ildizga surtib yuving.",
                "match_percent": 80,
            },
            {
                "id": 9,
                "name": "Преображение",
                "category": "mask",
                "purpose_uz": "Haftada bir marta.",
            },
        ],
        morning_time="07:30",
        evening_time="21:00",
    )
    analyses = plan.pop("_analyses")
    assert plan["morning"][0]["time"] == "07:30"
    assert plan["morning"][0]["product_id"] == 4
    assert plan["morning"][0]["product_name"] == "Длина Мечты"
    assert plan["morning"][0]["subtitle"] == "Ildizga surtib yuving."
    assert any(row["product_id"] == 9 for row in plan["weekly"])
    assert len(plan["weekly_schedule"]) == 7
    assert {row["product_id"] for row in analyses} == {4, 9}
    assert hair_profile_key("dry", "wavy", "colored") == "dry|wavy|colored"


def test_generate_skips_empty_and_keeps_schema():
    plan = generate_care_plan(
        condition="oily",
        texture="straight",
        color_status="natural",
        products=[{"id": 1, "name": "Clear", "category": "shampoo"}],
        morning_time="08:00",
        evening_time="22:00",
    )
    assert plan["morning"][0]["time"] == "08:00"
    assert plan["morning"][0]["product_name"] == "Clear"
    assert plan["_usage"]["provider"] == "rules"
    assert isinstance(plan["_analyses"], list)
    assert care_plan_is_complete(plan)
    assert not care_plan_is_complete({"morning": [], "evening": [], "weekly": []})
    assert not care_plan_is_complete(None)
