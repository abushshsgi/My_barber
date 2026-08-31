import io

from PIL import Image

from ai.services.gemini_care_cover import COVER_SIDE, HARD_MAX_BYTES, compose_square_cover


def test_compose_square_cover_is_1600_jpeg_under_1mb():
    src = Image.new("RGB", (900, 1400), (32, 96, 64))
    buf = io.BytesIO()
    src.save(buf, format="JPEG", quality=90)
    out = compose_square_cover(buf.getvalue())
    result = Image.open(io.BytesIO(out))
    assert result.size == (COVER_SIDE, COVER_SIDE)
    assert result.format == "JPEG"
    assert len(out) <= HARD_MAX_BYTES
    assert result.getpixel((0, 0)) == (255, 255, 255)


def test_compose_enlarges_tiny_product_on_white():
    canvas = Image.new("RGB", (1600, 1600), (255, 255, 255))
    canvas.paste(Image.new("RGB", (180, 420), (40, 120, 50)), (710, 590))
    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=95)
    out = Image.open(io.BytesIO(compose_square_cover(buf.getvalue()))).convert("RGB")
    green = 0
    for y in range(0, COVER_SIDE, 8):
        for x in range(0, COVER_SIDE, 8):
            r, g, b = out.getpixel((x, y))
            if g > r + 20 and g > b + 20:
                green += 1
    assert green > 80
