"""Generate Mysaloon brand icons from the official logo PNG."""
from __future__ import annotations

import collections
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\PC\.cursor\projects\c-Users-PC-Desktop-My-barber\assets"
    r"\c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_f2d16f46df0792975e4d3d7b791e3b13_images_high-resolution-color-logo_2_-3a5a149c-1d98-4687-bba8-ade5f67833e5.png"
)

PUBLIC_DIRS = [
    ROOT / "apps" / "user" / "public",
    ROOT / "apps" / "barber" / "public",
    ROOT / "packages" / "user-ui" / "public",
]

ADMIN_PUBLIC = ROOT / "apps" / "admin" / "public"


def sample_orange(im: Image.Image) -> str:
    oranges: list[tuple[int, int, int]] = []
    for x in range(im.width):
        for y in range(im.height):
            r, g, b = im.getpixel((x, y))[:3]
            if r > 180 and 60 < g < 180 and b < 100:
                oranges.append((r, g, b))
    if not oranges:
        return "#FF6A00"
    (r, g, b), _ = collections.Counter(oranges).most_common(1)[0]
    return f"#{r:02x}{g:02x}{b:02x}"


def fit_square(im: Image.Image, size: int) -> Image.Image:
    """Resize square logo to exact size (cover)."""
    return im.resize((size, size), Image.Resampling.LANCZOS)


def write_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True)


def write_ico(im: Image.Image, path: Path) -> None:
    sizes = [(16, 16), (32, 32), (48, 48)]
    icons = [im.resize(s, Image.Resampling.LANCZOS) for s in sizes]
    icons[0].save(path, format="ICO", sizes=sizes)


def generate_for_dir(logo: Image.Image, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    write_png(logo, out / "brand-logo.png")
    write_png(fit_square(logo, 32), out / "favicon-32.png")
    write_png(fit_square(logo, 180), out / "apple-touch-icon.png")
    write_png(fit_square(logo, 192), out / "icon-192.png")
    write_png(fit_square(logo, 512), out / "icon-512.png")
    write_png(fit_square(logo, 512), out / "icon-512-maskable.png")
    write_ico(logo, out / "favicon.ico")


def write_android_mipmaps(logo: Image.Image, app: str) -> None:
    base = ROOT / "apps" / app / "android" / "app" / "src" / "main" / "res"
    if not base.exists():
        return
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in densities.items():
        dest = base / folder
        if not dest.exists():
            continue
        icon = fit_square(logo, size)
        for name in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
            write_png(icon, dest / name)

    # Splash screens — full black with centered logo
    splash_dirs = [
        "drawable",
        "drawable-port-mdpi",
        "drawable-port-hdpi",
        "drawable-port-xhdpi",
        "drawable-port-xxhdpi",
        "drawable-port-xxxhdpi",
        "drawable-land-mdpi",
        "drawable-land-hdpi",
        "drawable-land-xhdpi",
        "drawable-land-xxhdpi",
        "drawable-land-xxxhdpi",
    ]
    sizes = {
        "drawable": (480, 800),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (1080, 1920),
        "drawable-port-xxxhdpi": (1440, 2560),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1920, 1080),
        "drawable-land-xxxhdpi": (2560, 1440),
    }
    for folder in splash_dirs:
        dest = base / folder / "splash.png"
        if not dest.parent.exists():
            continue
        w, h = sizes[folder]
        canvas = Image.new("RGB", (w, h), (0, 0, 0))
        mark = min(w, h) // 3
        icon = fit_square(logo, mark)
        canvas.paste(icon, ((w - mark) // 2, (h - mark) // 2))
        write_png(canvas, dest)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Logo source missing: {SRC}")

    logo = Image.open(SRC).convert("RGBA")
    # Flatten onto black (logo already black bg)
    bg = Image.new("RGBA", logo.size, (0, 0, 0, 255))
    flat = Image.alpha_composite(bg, logo).convert("RGB")

    orange = sample_orange(flat)
    print(f"orange accent: {orange}")

    for d in PUBLIC_DIRS:
        generate_for_dir(flat, d)
        print(f"updated {d}")

    ADMIN_PUBLIC.mkdir(parents=True, exist_ok=True)
    generate_for_dir(flat, ADMIN_PUBLIC)
    print(f"updated {ADMIN_PUBLIC}")

    # Keep a shared copy under packages/shared if useful for docs
    brand_dir = ROOT / "packages" / "shared" / "brand"
    brand_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC, brand_dir / "mysaloon-logo.png")
    write_png(flat, brand_dir / "mysaloon-logo-rgb.png")
    (brand_dir / "accent.txt").write_text(orange + "\n", encoding="utf-8")

    write_android_mipmaps(flat, "user")
    write_android_mipmaps(flat, "barber")
    print("android icons/splashes updated")


if __name__ == "__main__":
    main()
