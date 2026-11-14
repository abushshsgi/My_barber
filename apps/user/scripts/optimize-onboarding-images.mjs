#!/usr/bin/env node
/** Compress /public/images/onboarding WebP variants (requires Pillow). */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "images", "onboarding");
const py = `
from PIL import Image
from pathlib import Path
d = Path(${JSON.stringify(publicRoot)})
d.mkdir(parents=True, exist_ok=True)
src = d / "universal.webp"
if not src.is_file():
    png = d / "universal.png"
    if png.is_file():
        src = png
    else:
        raise SystemExit("universal.webp or universal.png missing")
im = Image.open(src).convert("RGB")
for w in (384, 576, 768):
    copy = im.copy()
    copy.thumbnail((w, int(w * 16 / 9)), Image.Resampling.LANCZOS)
    out = d / f"universal-{w}.webp"
    copy.save(out, "WEBP", quality=78, method=6)
    print(out.name, out.stat().st_size)
im.save(d / "universal.webp", "WEBP", quality=78, method=6)
print("universal.webp", (d / "universal.webp").stat().st_size)
`;

if (!existsSync(dirname(publicRoot))) {
  mkdirSync(dirname(publicRoot), { recursive: true });
}

const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const r = spawnSync(python, ["-c", py], { stdio: "inherit" });
process.exit(r.status ?? 1);