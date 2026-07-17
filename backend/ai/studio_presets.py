"""Morf AI Studio — soch rangi, soqol va finish (namlik/matte) variantlari."""

from __future__ import annotations

from typing import Any

# Faqat salon-edit: rang, soqol, finish. Yuz rangi / uslub almashtirish yo'q.
# Har bir instruction: yuz/teri/ko'z piksellarini qayta chizmaslik — faqat lokal o'zgarish.

_FACE_LOCK = (
    "CRITICAL PIXEL LOCK: Do NOT redraw, repaint, smooth, recolor, or re-light the face, "
    "skin, eyes, eyelids, lips, teeth, ears, neck, or hands. Copy those regions from the "
    "source photo with identical texture, pores, freckles, and sharpness. "
    "Do NOT change clothing or background. Do NOT change camera framing or crop."
)

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
                    "Selective hair recolor only: change hair strand color to natural warm blonde "
                    "with soft root depth and realistic shine. Keep the identical haircut shape, "
                    "length, parting, and strand flow. "
                    f"{_FACE_LOCK} "
                    "No wig look, no color banding, no face makeup change."
                ),
            },
            {
                "id": "hair_brunette",
                "label_uz": "Jigarrang",
                "label_en": "Brunette",
                "swatch": "#4A2F1F",
                "instruction": (
                    "Selective hair recolor only: rich natural brunette with subtle dimension. "
                    "Keep identical haircut shape and strand layout. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "hair_black",
                "label_uz": "Qora",
                "label_en": "Black",
                "swatch": "#111111",
                "instruction": (
                    "Selective hair recolor only: deep natural black with soft specular highlights "
                    "(not flat plastic black). Keep identical haircut. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "hair_auburn",
                "label_uz": "Mis",
                "label_en": "Copper",
                "swatch": "#A0522D",
                "instruction": (
                    "Selective hair recolor only: natural copper / auburn with warm lowlights. "
                    "Keep identical haircut. Salon dye look, not cartoon red. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "hair_ash",
                "label_uz": "Kulrang",
                "label_en": "Ash",
                "swatch": "#8B8680",
                "instruction": (
                    "Selective hair recolor only: cool ash brown-gray with natural dimension. "
                    "Keep identical haircut. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "hair_platinum",
                "label_uz": "Platina",
                "label_en": "Platinum",
                "swatch": "#F2EDE4",
                "instruction": (
                    "Selective hair recolor only: platinum blonde with soft cool tones and "
                    "realistic root shadow. Avoid brassiness and overexposed white hair. "
                    "Keep identical haircut. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "hair_highlights",
                "label_uz": "Highlight",
                "label_en": "Highlights",
                "swatch": "#C4A574",
                "instruction": (
                    "Add subtle balayage / face-framing highlights on existing hair only. "
                    "Soft blend, no harsh stripes. Keep identical haircut shape. "
                    f"{_FACE_LOCK}"
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
                    "Remove facial hair only for a clean shave. Reveal the original skin under "
                    "the beard with natural texture — no beauty blur. "
                    "Do NOT redraw eyes, nose, mouth, head hair, clothing, or background. "
                    "Keep exact framing and sharpness."
                ),
            },
            {
                "id": "beard_stubble",
                "label_uz": "Qisqa",
                "label_en": "Stubble",
                "instruction": (
                    "Add or adjust only facial hair to neat short designer stubble. "
                    "Do NOT redraw eyes, nose, mouth, head hair, clothing, or background. "
                    "Keep exact framing and skin texture outside the beard area."
                ),
            },
            {
                "id": "beard_full",
                "label_uz": "To'liq",
                "label_en": "Full",
                "instruction": (
                    "Add or adjust only facial hair to a well-groomed medium full beard matching "
                    "the head hair color. Do NOT redraw eyes, nose, mouth, head hair, clothing, "
                    "or background. Keep exact framing."
                ),
            },
            {
                "id": "beard_shape",
                "label_uz": "Shakl",
                "label_en": "Shaped",
                "instruction": (
                    "Shape/tidy facial hair lines only (barber cheek and neck lines). "
                    "Do NOT redraw eyes, nose, mouth, head hair, clothing, or background."
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
                    "Hair finish only: styled wet-look shine and defined strands. "
                    "Do NOT change hair color family, haircut shape, face, skin, clothing, "
                    "or background. No oily plastic look. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "finish_matte",
                "label_uz": "Matte",
                "label_en": "Matte",
                "instruction": (
                    "Hair finish only: clean matte textured product look. "
                    "Do NOT change hair color, cut, face, skin, clothing, or background. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "finish_gloss",
                "label_uz": "Yaltiroq",
                "label_en": "Gloss",
                "instruction": (
                    "Hair finish only: healthy salon gloss/shine on hair strands. "
                    "Do NOT change cut, color family, face, skin, clothing, or background. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "finish_volume",
                "label_uz": "Hajm",
                "label_en": "Volume",
                "instruction": (
                    "Hair only: subtle lift/volume on top while keeping the same cut family. "
                    "Minimal change. Do NOT redraw face or change skin. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "finish_soft_light",
                "label_uz": "Yumshoq yorug'",
                "label_en": "Soft light",
                "instruction": (
                    "Lighting mood only: slightly softer natural studio light. "
                    "Preserve identity, haircut, hair color, clothing, and composition. "
                    "NO beauty filter, NO skin smoothing, NO face redraw. "
                    f"{_FACE_LOCK}"
                ),
            },
            {
                "id": "finish_sharp",
                "label_uz": "Keskin",
                "label_en": "Crisp",
                "instruction": (
                    "Global crispness/contrast only — keep every facial feature identical. "
                    "NO skin smoothing, NO face redraw, NO hair restyle. "
                    f"{_FACE_LOCK}"
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
