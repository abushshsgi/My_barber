"""Morf AI Studio — rasm ustida qo'llanadigan tayyor variantlar."""

from __future__ import annotations

from typing import Any

# category → options with English edit instructions for the image model
STUDIO_PRESETS: dict[str, dict[str, Any]] = {
    "hair_color": {
        "label_uz": "Soch rangi",
        "label_en": "Hair color",
        "options": [
            {
                "id": "hair_blonde",
                "label_uz": "Sariq",
                "label_en": "Blonde",
                "instruction": "Change ONLY the hair color to natural blonde. Keep the exact same haircut shape, length, face, skin, and identity.",
            },
            {
                "id": "hair_brunette",
                "label_uz": "Jigarrang",
                "label_en": "Brunette",
                "instruction": "Change ONLY the hair color to rich natural brunette brown. Keep the exact same haircut, face, skin, and identity.",
            },
            {
                "id": "hair_black",
                "label_uz": "Qora",
                "label_en": "Black",
                "instruction": "Change ONLY the hair color to deep natural black. Keep the exact same haircut, face, skin, and identity.",
            },
            {
                "id": "hair_auburn",
                "label_uz": "Qizil-jigarrang",
                "label_en": "Auburn",
                "instruction": "Change ONLY the hair color to natural auburn / copper-red brown. Keep the exact same haircut, face, skin, and identity.",
            },
            {
                "id": "hair_ash",
                "label_uz": "Kulrang",
                "label_en": "Ash",
                "instruction": "Change ONLY the hair color to cool ash brown-gray. Keep the exact same haircut, face, skin, and identity.",
            },
            {
                "id": "hair_platinum",
                "label_uz": "Platina",
                "label_en": "Platinum",
                "instruction": "Change ONLY the hair color to platinum blonde. Keep the exact same haircut, face, skin, and identity.",
            },
            {
                "id": "hair_highlights",
                "label_uz": "Highlight",
                "label_en": "Highlights",
                "instruction": "Add subtle natural balayage highlights to the hair. Keep the same haircut shape, face, skin, and identity.",
            },
        ],
    },
    "hair_style": {
        "label_uz": "Soch uslubi",
        "label_en": "Hair style",
        "options": [
            {
                "id": "style_shorter",
                "label_uz": "Qisqaroq",
                "label_en": "Shorter",
                "instruction": "Make the haircut noticeably shorter while keeping the same overall style family and the exact same face, skin, and identity.",
            },
            {
                "id": "style_longer",
                "label_uz": "Uzunroq",
                "label_en": "Longer",
                "instruction": "Make the hair slightly longer and fuller while keeping a professional salon look and the exact same face, skin, and identity.",
            },
            {
                "id": "style_curly",
                "label_uz": "Jingalak",
                "label_en": "Curly",
                "instruction": "Restyle the hair into natural soft curls. Keep the exact same face, skin tone, age, and identity.",
            },
            {
                "id": "style_straight",
                "label_uz": "Tekis",
                "label_en": "Straight",
                "instruction": "Restyle the hair into sleek straight hair. Keep the exact same face, skin tone, age, and identity.",
            },
            {
                "id": "style_wavy",
                "label_uz": "To'lqin",
                "label_en": "Wavy",
                "instruction": "Restyle the hair into soft natural waves. Keep the exact same face, skin tone, age, and identity.",
            },
            {
                "id": "style_volume",
                "label_uz": "Hajmli",
                "label_en": "Volume",
                "instruction": "Add more volume and lift to the hair on top while keeping a realistic salon finish and the exact same face and identity.",
            },
            {
                "id": "style_fade",
                "label_uz": "Fade",
                "label_en": "Fresh fade",
                "instruction": "Apply a clean modern fade / taper on the sides while keeping the top style cohesive and the exact same face and identity.",
            },
        ],
    },
    "skin_tone": {
        "label_uz": "Yuz rangi",
        "label_en": "Skin tone",
        "options": [
            {
                "id": "skin_lighter",
                "label_uz": "Yorug'roq",
                "label_en": "Lighter",
                "instruction": "Slightly lighten the skin tone naturally. Keep the exact same face structure, hair, age, and identity — only subtle skin tone shift.",
            },
            {
                "id": "skin_darker",
                "label_uz": "Qorong'iroq",
                "label_en": "Darker",
                "instruction": "Slightly deepen the skin tone naturally. Keep the exact same face structure, hair, age, and identity — only subtle skin tone shift.",
            },
            {
                "id": "skin_warm",
                "label_uz": "Iliq",
                "label_en": "Warm",
                "instruction": "Give the skin a warmer golden undertone. Keep the exact same face structure, hair, and identity.",
            },
            {
                "id": "skin_cool",
                "label_uz": "Sovuq",
                "label_en": "Cool",
                "instruction": "Give the skin a cooler undertone. Keep the exact same face structure, hair, and identity.",
            },
            {
                "id": "skin_even",
                "label_uz": "Tekis",
                "label_en": "Even tone",
                "instruction": "Even out the skin tone for a clean natural complexion. Keep the exact same face structure, hair, and identity — no beauty filter look.",
            },
            {
                "id": "skin_glow",
                "label_uz": "Yaltiroq",
                "label_en": "Healthy glow",
                "instruction": "Add a subtle healthy skin glow. Keep the exact same face structure, hair, and identity — photorealistic, not plastic.",
            },
        ],
    },
    "beard": {
        "label_uz": "Soqol",
        "label_en": "Beard",
        "options": [
            {
                "id": "beard_clean",
                "label_uz": "Toza soqol",
                "label_en": "Clean shave",
                "instruction": "Remove facial hair for a clean shave. Keep the exact same face structure, hair on head, skin, and identity.",
            },
            {
                "id": "beard_stubble",
                "label_uz": "Qisqa soqol",
                "label_en": "Stubble",
                "instruction": "Add neat short designer stubble. Keep the exact same face structure, head hair, and identity.",
            },
            {
                "id": "beard_full",
                "label_uz": "To'liq soqol",
                "label_en": "Full beard",
                "instruction": "Add a well-groomed medium full beard. Keep the exact same face structure, head hair, and identity.",
            },
            {
                "id": "beard_shape",
                "label_uz": "Shakllangan",
                "label_en": "Shaped",
                "instruction": "Shape and tidy the facial hair with clean barber lines. Keep the exact same face structure, head hair, and identity.",
            },
        ],
    },
    "look": {
        "label_uz": "Ko'rinish",
        "label_en": "Look",
        "options": [
            {
                "id": "look_soft",
                "label_uz": "Yumshoq",
                "label_en": "Soft light",
                "instruction": "Adjust lighting to soft natural studio light. Keep the exact same face, hair, skin tone, and identity — only lighting mood.",
            },
            {
                "id": "look_sharp",
                "label_uz": "Keskin",
                "label_en": "Sharp contrast",
                "instruction": "Increase contrast and clarity for a sharp editorial look. Keep the exact same face, hair, and identity.",
            },
            {
                "id": "look_warm_light",
                "label_uz": "Iliq yorug'",
                "label_en": "Warm light",
                "instruction": "Warm the overall lighting slightly. Keep the exact same face, hair, and identity.",
            },
            {
                "id": "look_cool_light",
                "label_uz": "Sovuq yorug'",
                "label_en": "Cool light",
                "instruction": "Cool the overall lighting slightly. Keep the exact same face, hair, and identity.",
            },
            {
                "id": "look_wet",
                "label_uz": "Nam soch",
                "label_en": "Wet look",
                "instruction": "Give the hair a styled wet-look finish. Keep the exact same face, skin, and identity.",
            },
            {
                "id": "look_matte",
                "label_uz": "Matte",
                "label_en": "Matte finish",
                "instruction": "Give the hair a clean matte textured finish. Keep the exact same face, skin, and identity.",
            },
        ],
    },
}


def list_studio_catalog() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for category_id, cat in STUDIO_PRESETS.items():
        out.append(
            {
                "id": category_id,
                "label_uz": cat["label_uz"],
                "label_en": cat["label_en"],
                "options": [
                    {
                        "id": opt["id"],
                        "label_uz": opt["label_uz"],
                        "label_en": opt["label_en"],
                    }
                    for opt in cat["options"]
                ],
            }
        )
    return out


def get_studio_option(preset_id: str) -> dict[str, Any] | None:
    pid = (preset_id or "").strip()
    if not pid:
        return None
    for category_id, cat in STUDIO_PRESETS.items():
        for opt in cat["options"]:
            if opt["id"] == pid:
                return {
                    "id": opt["id"],
                    "category_id": category_id,
                    "label_uz": opt["label_uz"],
                    "label_en": opt["label_en"],
                    "instruction": opt["instruction"],
                    "category_label_uz": cat["label_uz"],
                }
    return None
