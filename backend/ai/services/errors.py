"""AI xizmatlari uchun umumiy xato turlari va HTTP xabarlar."""

from __future__ import annotations


class AiStyleError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def read_http_error_body(exc) -> str:
    try:
        return exc.read().decode("utf-8", errors="replace")
    except Exception:
        return ""


def map_gemini_http_error(status: int, body: str, *, kind: str = "general", model: str = "") -> str:
    lowered = body.lower()
    if status in (401, 403) or "api key" in lowered or "permission" in lowered:
        return (
            "GEMINI API kaliti noto'g'ri yoki ruxsat yo'q. "
            "aistudio.google.com/apikey dan yangi kalit oling."
        )
    if status == 429 or "quota" in lowered or "rate" in lowered or "exceeded" in lowered:
        if kind == "image":
            return (
                "Rasm generatsiya limiti tugadi (Google AI). "
                "Bepul rejada tez tugaydi — aistudio.google.com da billing yoqing "
                "yoki 30–60 daqiqadan keyin qayta urinib ko'ring."
            )
        return (
            "AI so'rov limiti tugadi (Google). "
            "Biroz kuting yoki aistudio.google.com da billing/limitni tekshiring."
        )
    if status == 503 or "unavailable" in lowered or "high demand" in lowered:
        return "AI hozir juda yuklangan. 1–2 daqiqadan keyin qayta urinib ko'ring."
    if status == 404:
        if kind == "image":
            return (
                "Rasm generatsiya modeli topilmadi. "
                "VERTEX_IMAGE_MODEL=gemini-3.1-flash-lite-image ni tekshiring."
            )
        suffix = f" ({model})" if model else ""
        return f"AI model topilmadi{suffix}. GEMINI_MODEL ni tekshiring."
    return "AI tahlil vaqtincha ishlamayapti. Keyinroq urinib ko'ring."
