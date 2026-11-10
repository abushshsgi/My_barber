#!/usr/bin/env node
/** Regenerate /public/ai-style WebP variants from PNG sources (requires Pillow: pip install pillow). */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "ai-style");

const py = `
from PIL import Image
from pathlib import Path
d = Path(${JSON.stringify(root)})
for png in sorted(d.glob("*.png")):
    stem = png.stem
    im = Image.open(png).convert("RGB")
    widths = [480, 720, 864] if stem == "try-on-selfie-hero" else [720, 1080]
    for w in widths:
        copy = im.copy()
        copy.thumbnail((w, int(w * 1.35)), Image.Resampling.LANCZOS)
        out = d / f"{stem}-{w}.webp"
        copy.save(out, "WEBP", quality=82, method=4)
        print(out.name, out.stat().st_size)
`;

if (!existsSync(root)) {
  console.error("Missing", root);
  process.exit(1);
}

const r = spawnSync("python", ["-c", py], { stdio: "inherit" });
process.exit(r.status ?? 1);
