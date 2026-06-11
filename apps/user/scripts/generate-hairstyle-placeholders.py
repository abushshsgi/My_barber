#!/usr/bin/env python3
"""Kulrang fonli placeholder WebP — AI rasmlar tayyor bo'lguncha."""
from __future__ import annotations

import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("Install Pillow: pip install Pillow")

ROOT = Path(__file__).resolve().parents[1] / "public" / "hairstyles"
W, H = 768, 1024
BG = (232, 232, 232)

MEN = [
    "mid-fade", "low-fade", "skin-fade", "buzz-cut", "textured-crop", "pompadour",
    "undercut", "side-part", "french-crop", "slick-back", "curly-top-fade", "modern-mullet",
]
WOMEN = [
    "soft-bob", "long-layers", "balayage", "pixie-cut", "beach-waves", "straight-lob",
    "curtain-bangs", "shag-cut", "braids", "updo-bun", "blunt-cut", "highlights",
]


def draw_placeholder(label: str) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    cx, cy = W // 2, int(H * 0.38)
    draw.ellipse([cx - 170, cy - 120, cx + 170, cy + 120], fill=(208, 208, 208))
    draw.rounded_rectangle([int(W * 0.28), int(H * 0.48), int(W * 0.72), int(H * 0.83)], radius=24, fill=(200, 200, 200))
    text = label.replace("-", " ").title()
    draw.text((W // 2, int(H * 0.9)), text, fill=(102, 102, 102), anchor="mm")
    draw.text((W // 2, int(H * 0.94)), "AI namuna", fill=(153, 153, 153), anchor="mm")
    return img


def save(dir_name: str, slug: str, label: str | None = None) -> None:
    out_dir = ROOT / dir_name
    out_dir.mkdir(parents=True, exist_ok=True)
    img = draw_placeholder(label or slug)
    img.save(out_dir / f"{slug}.webp", "WEBP", quality=85)


def main() -> None:
    for slug in MEN:
        save("men", slug)
    for slug in WOMEN:
        save("women", slug)
    save("men", "_reference", "Men Reference")
    save("women", "_reference", "Women Reference")
    print(f"Generated {len(MEN) + len(WOMEN) + 2} placeholders in {ROOT}")


if __name__ == "__main__":
    main()
