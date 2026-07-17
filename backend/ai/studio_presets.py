"""Morf AI Studio — soch rangi, soqol va finish (namlik/matte) variantlari."""

from __future__ import annotations

from typing import Any

# Faqat salon-edit: rang, soqol, finish. Yuz rangi / uslub almashtirish yo'q.
STUDIO_PRESETS: dict[str, dict[str, Any]] = {
    "hair_color": {
        "label_uz": "Rang",
        "label_en": "Color",
        "options": [
            {
                "id": "hair_blonde",
                "label_uz": "Sariq",
                "label_en": "Blonde",
                "swatch": "#E8D5A3",
                "instruction": (
                    "Recolor ONLY the hair to a natural warm blonde with realistic root depth "
                    "and soft shine. Keep the EXACT same haircut shape, length, parting, face, "
                    "skin tone, beard (if any), clothing, background, and identity. "
                    "Photorealistic salon dye result — no wig look, no color banding."
                ),
            },
            {
                "id": "hair_brunette",
                "label_uz": "Jigarrang",
                "label_en": "Brunette",
                "swatch": "#4A2F1F",
                "instruction": (
                    "Recolor ONLY the hair to a rich natural brunette with subtle dimension. "
                    "Keep the EXACT same haircut, face, skin, beard, clothing, background, and identity. "
                    "Photorealistic salon color — natural light falloff on strands."
                ),
            },
            {
                "id": "hair_black",
                "label_uz": "Qora",
                "label_en": "Black",
                "swatch": "#111111",
                "instruction": (
                    "Recolor ONLY the hair to deep natural black with soft specular highlights. "
                    "Keep the EXACT same haircut, face, skin, beard, clothing, background, and identity. "
                    "Avoid flat ink-black plastic look."
                ),
            },
            {
                "id": "hair_auburn",
                "label_uz": "Mis",
                "label_en": "Copper",
                "swatch": "#A0522D",
                "instruction": (
                    "Recolor ONLY the hair to natural copper / auburn with warm lowlights. "
                    "Keep the EXACT same haircut, face, skin, beard, clothing, background, and identity. "
                    "Salon-quality color, not cartoon red."
                ),
            },
            {
                "id": "hair_ash",
                "label_uz": "Kulrang",
                "label_en": "Ash",
                "swatch": "#8B8680",
                "instruction": (
                    "Recolor ONLY the hair to cool ash brown-gray with natural dimension. "
                    "Keep the EXACT same haircut, face, skin, beard, clothing, background, and identity."
                ),
            },
            {
                "id": "hair_platinum",
                "label_uz": "Platina",
                "label_en": "Platinum",
                "swatch": "#F2EDE4",
                "instruction": (
                    "Recolor ONLY the hair to platinum blonde with soft cool tones and realistic "
                    "root shadow. Keep the EXACT same haircut, face, skin, beard, clothing, "
                    "background, and identity. Avoid yellow brassiness and overexposed white hair."
                ),
            },
            {
                "id": "hair_highlights",
                "label_uz": "Highlight",
                "label_en": "Highlights",
                "swatch": "#C4A574",
                "instruction": (
                    "Add subtle natural balayage / face-framing highlights on the existing hair color. "
                    "Keep the EXACT same haircut shape, face, skin, beard, clothing, background, and identity. "
                    "Soft blend — no harsh stripes."
                ),
            },
        ],
    },
    "beard": {
        "label_uz": "Soqol",
        "label_en": "Beard",
        "options": [
            {
                "id": "beard_clean",
                "label_uz": "Toza",
                "label_en": "Clean",
                "instruction": (
                    "Remove facial hair for a clean professional shave. Keep natural skin texture "
                    "under the beard area — no blur filter. Keep the EXACT same face structure, "
                    "head hair, clothing, background, and identity."
                ),
            },
            {
                "id": "beard_stubble",
                "label_uz": "Qisqa",
                "label_en": "Stubble",
                "instruction": (
                    "Apply neat short designer stubble (1–3 day growth) with natural density. "
                    "Keep the EXACT same face structure, head hair, clothing, background, and identity. "
                    "Photorealistic barber finish."
                ),
            },
            {
                "id": "beard_full",
                "label_uz": "To'liq",
                "label_en": "Full",
                "instruction": (
                    "Add a well-groomed medium full beard with clean cheek and neck lines. "
                    "Keep the EXACT same face structure, head hair, clothing, background, and identity. "
                    "Match existing hair color naturally."
                ),
            },
            {
                "id": "beard_shape",
                "label_uz": "Shakl",
                "label_en": "Shaped",
                "instruction": (
                    "Shape and tidy existing facial hair with sharp barber cheek/neck lines "
                    "and even density. If clean-shaven, add a lightly shaped short beard. "
                    "Keep the EXACT same face structure, head hair, clothing, background, and identity."
                ),
            },
        ],
    },
    "finish": {
        "label_uz": "Finish",
        "label_en": "Finish",
        "options": [
            {
                "id": "finish_wet",
                "label_uz": "Nam",
                "label_en": "Wet",
                "instruction": (
                    "Give the hair a styled wet-look finish with natural product shine and "
                    "defined strands. Do NOT change haircut shape, color, face, skin, beard, "
                    "clothing, or background. Photorealistic salon wet look — not oily plastic."
                ),
            },
            {
                "id": "finish_matte",
                "label_uz": "Matte",
                "label_en": "Matte",
                "instruction": (
                    "Give the hair a clean matte textured finish with soft separation. "
                    "Do NOT change haircut shape, color, face, skin, beard, clothing, or background. "
                    "Natural clay/paste look."
                ),
            },
            {
                "id": "finish_gloss",
                "label_uz": "Yaltiroq",
                "label_en": "Gloss",
                "instruction": (
                    "Add healthy salon gloss / light shine to the hair only. "
                    "Do NOT change haircut, color family, face, skin, beard, clothing, or background."
                ),
            },
            {
                "id": "finish_volume",
                "label_uz": "Hajm",
                "label_en": "Volume",
                "instruction": (
                    "Add subtle lift and volume on top while keeping the same haircut family. "
                    "Do NOT change face, skin, beard, clothing, or background. Natural salon volume."
                ),
            },
            {
                "id": "finish_soft_light",
                "label_uz": "Yumshoq yorug'",
                "label_en": "Soft light",
                "instruction": (
                    "Adjust ONLY the lighting mood to soft natural studio light on the subject. "
                    "Keep identity, haircut, hair color, beard, clothing, and scene composition. "
                    "No beauty filter, no skin retouch."
                ),
            },
            {
                "id": "finish_sharp",
                "label_uz": "Keskin",
                "label_en": "Crisp",
                "instruction": (
                    "Increase local contrast and crispness for a sharp editorial portrait look. "
                    "Keep identity, haircut, hair color, beard, clothing intact. No skin smoothing."
                ),
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
                        **({"swatch": opt["swatch"]} if opt.get("swatch") else {}),
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
                    "swatch": opt.get("swatch"),
                }
    return None
