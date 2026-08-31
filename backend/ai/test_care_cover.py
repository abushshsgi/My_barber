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
