#!/usr/bin/env python3
"""Kulrang fonli placeholder WebP — har yosh guruhi uchun (AI rasmlar tayyor bo'lguncha)."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("Install Pillow: pip install Pillow")

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))

from ai.hairstyle_seed import HAIRSTYLE_SEED  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "public" / "hairstyles"
W, H = 768, 1024
BG = (232, 232, 232)

AGE_VISUALS = {
    "kids": {"head_rx": 120, "head_ry": 88, "body_top": 0.50, "accent": (180, 200, 220)},
    "teen": {"head_rx": 145, "head_ry": 105, "body_top": 0.49, "accent": (190, 190, 210)},
    "young": {"head_rx": 165, "head_ry": 118, "body_top": 0.48, "accent": (200, 200, 200)},
    "adult": {"head_rx": 170, "head_ry": 122, "body_top": 0.48, "accent": (195, 190, 185)},
    "mature": {"head_rx": 175, "head_ry": 128, "body_top": 0.47, "accent": (190, 185, 180)},
}

AGE_LABELS = {
    "kids": "Bolalar 10-12",
    "teen": "O'smir 13-17",
    "young": "Yosh 18-29",
    "adult": "30+",
    "mature": "45+",
}


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_placeholder(*, slug: str, age_group: str, audience: str) -> Image.Image:
    vis = AGE_VISUALS[age_group]
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    cx, cy = W // 2, int(H * 0.36)
    accent = vis["accent"]

    draw.ellipse(
        [cx - vis["head_rx"], cy - vis["head_ry"], cx + vis["head_rx"], cy + vis["head_ry"]],
        fill=accent,
    )
    body_top = int(H * vis["body_top"])
    draw.rounded_rectangle(
        [int(W * 0.28), body_top, int(W * 0.72), int(H * 0.83)],
        radius=24,
        fill=(200, 200, 200),
    )

    title_font = _font(28)
    sub_font = _font(18)
    small_font = _font(14)

    style_name = "Reference" if slug == "_reference" else slug.replace("-", " ").title()
    draw.text((W // 2, int(H * 0.87)), style_name, fill=(70, 70, 70), anchor="mm", font=title_font)
    draw.text(
        (W // 2, int(H * 0.905)),
        f"{AGE_LABELS[age_group]} · {audience.title()}",
        fill=(110, 110, 110),
        anchor="mm",
        font=sub_font,
    )
    draw.text((W // 2, int(H * 0.945)), "AI namuna (placeholder)", fill=(150, 150, 150), anchor="mm", font=small_font)
    return img


def save_image(rel_path: str, img: Image.Image) -> None:
    out = OUT / rel_path
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "WEBP", quality=85)


def rel_path(audience: str, age_group: str, slug: str) -> str:
    if age_group == "young":
        return f"{audience}/{slug}.webp"
    return f"{audience}/{age_group}/{slug}.webp"


def main() -> None:
    count = 0
    seen: set[str] = set()

    for row in HAIRSTYLE_SEED:
        audience = row["audience"]
        slug = row["slug"]
        for age_group in row.get("age_groups", ["teen", "young", "adult"]):
            path = rel_path(audience, age_group, slug)
            if path in seen:
                continue
            seen.add(path)
            img = draw_placeholder(slug=slug, age_group=age_group, audience=audience)
            save_image(path, img)
            count += 1

        for age_group in row.get("age_groups", ["teen", "young", "adult"]):
            ref_path = rel_path(audience, age_group, "_reference")
            if ref_path in seen:
                continue
            seen.add(ref_path)
            img = draw_placeholder(slug="_reference", age_group=age_group, audience=audience)
            save_image(ref_path, img)
            count += 1

    print(f"Generated {count} age-aware placeholders in {OUT}")


if __name__ == "__main__":
    main()
