#!/usr/bin/env python3
"""
Gemini Imagen orqali Explore soch rasmlarini generatsiya qilish.

Talab: GEMINI_API_KEY muhit o'zgaruvchisi yoki backend/.env

  export GEMINI_API_KEY=your_key
  pip install google-genai pillow
  python3 apps/user/scripts/generate-hairstyle-images.py --age-group adult --audience men
  python3 apps/user/scripts/generate-hairstyle-images.py --all-men
  python3 apps/user/scripts/generate-hairstyle-images.py --dry-run --all-men
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ai.hairstyle_seed import HAIRSTYLE_SEED  # noqa: E402
from hairstyle_prompts import (  # noqa: E402
    NEGATIVE_PROMPT,
    output_path,
    reference_prompt,
    style_prompt,
)

OUT = Path(__file__).resolve().parents[1] / "public" / "hairstyles"
W, H = 768, 1024


def load_api_key() -> str:
    key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if key:
        return key
    env_file = ROOT / "backend" / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit(
        "GEMINI_API_KEY topilmadi. backend/.env ga qo'shing yoki export qiling.\n"
        "Yoki placeholder: python3 apps/user/scripts/generate-hairstyle-placeholders.py"
    )


def _resize_webp(data: bytes, dest: Path) -> None:
    from PIL import Image

    img = Image.open(BytesIO(data)).convert("RGB")
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=85)


def generate_imagen(client, prompt: str) -> bytes:
    from google.genai import types

    response = client.models.generate_images(
        model="imagen-4.0-generate-001",
        prompt=f"{prompt}. Avoid: {NEGATIVE_PROMPT}",
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/jpeg",
            aspect_ratio="3:4",
        ),
    )
    if not response.generated_images:
        raise RuntimeError("Imagen javob bermadi")
    return response.generated_images[0].image.image_bytes


def generate_flash_image(client, prompt: str) -> bytes:
    from google.genai import types

    response = client.models.generate_content(
        model="gemini-2.0-flash-preview-image-generation",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
        ),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            return part.inline_data.data
    raise RuntimeError("Gemini Flash rasm qaytarmadi")


def generate_image(client, prompt: str, use_imagen: bool) -> bytes:
    if use_imagen:
        try:
            return generate_imagen(client, prompt)
        except Exception as exc:
            print(f"  Imagen xato, Flash ga o'tilmoqda: {exc}")
    return generate_flash_image(client, prompt)


def jobs_for(*, audience: str | None, age_group: str | None, slug: str | None) -> list[dict]:
    result: list[dict] = []
    for row in HAIRSTYLE_SEED:
        if audience and row["audience"] != audience:
            continue
        groups = row.get("age_groups", ["teen", "young", "adult"])
        for group in groups:
            if age_group and group != age_group:
                continue
            if slug and row["slug"] != slug:
                continue
            result.append(
                {
                    "audience": row["audience"],
                    "age_group": group,
                    "slug": row["slug"],
                    "kind": "style",
                }
            )
            result.append(
                {
                    "audience": row["audience"],
                    "age_group": group,
                    "slug": "_reference",
                    "kind": "reference",
                }
            )
    # dedupe references
    seen: set[tuple] = set()
    deduped: list[dict] = []
    for job in result:
        key = (job["audience"], job["age_group"], job["slug"], job["kind"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(job)
    return deduped


def run_job(client, job: dict, use_imagen: bool, force: bool, delay: float) -> None:
    rel = output_path(audience=job["audience"], age_group=job["age_group"], slug=job["slug"])
    dest = OUT / rel
    if dest.exists() and not force and job["kind"] == "style":
        print(f"  skip (mavjud): {rel}")
        return

    if job["kind"] == "reference":
        prompt = reference_prompt(audience=job["audience"], age_group=job["age_group"])
    else:
        prompt = style_prompt(
            audience=job["audience"],
            age_group=job["age_group"],
            slug=job["slug"],
        )

    print(f"  generatsiya: {rel}")
    raw = generate_image(client, prompt, use_imagen)
    _resize_webp(raw, dest)
    if delay > 0:
        time.sleep(delay)


def main() -> None:
    parser = argparse.ArgumentParser(description="Explore hairstyle AI image generator")
    parser.add_argument("--audience", choices=["men", "women"])
    parser.add_argument("--age-group", choices=["kids", "teen", "young", "adult", "mature"])
    parser.add_argument("--slug", help="masalan mid-fade")
    parser.add_argument("--all-men", action="store_true")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--reference-only", action="store_true")
    parser.add_argument("--force", action="store_true", help="mavjud fayllarni qayta yozish")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--imagen", action="store_true", default=True)
    parser.add_argument("--delay", type=float, default=2.0, help="so'rovlar orasidagi pauza")
    args = parser.parse_args()

    audience = args.audience
    if args.all_men:
        audience = "men"
    if args.all:
        audience = None

    jobs = jobs_for(audience=audience, age_group=args.age_group, slug=args.slug)
    if args.reference_only:
        jobs = [j for j in jobs if j["kind"] == "reference"]
        seen: set[tuple] = set()
        unique = []
        for j in jobs:
            k = (j["audience"], j["age_group"])
            if k in seen:
                continue
            seen.add(k)
            unique.append(j)
        jobs = unique

    print(f"Jami: {len(jobs)} ta rasm")
    for job in jobs:
        rel = output_path(audience=job["audience"], age_group=job["age_group"], slug=job["slug"])
        print(f"  - {rel} ({job['kind']})")

    if args.dry_run:
        return

    try:
        from google import genai
    except ImportError:
        raise SystemExit("pip install google-genai") from None

    client = genai.Client(api_key=load_api_key())
    for i, job in enumerate(jobs, 1):
        print(f"[{i}/{len(jobs)}]")
        try:
            run_job(client, job, args.imagen, args.force, args.delay)
        except Exception as exc:
            print(f"  XATO: {exc}")
    print("Tayyor!")


if __name__ == "__main__":
    main()
