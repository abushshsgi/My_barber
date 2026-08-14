"""Morf AI chatbot — system prompt va kontekst yig'ish."""

from __future__ import annotations

from typing import Any

MORF_CHAT_DAILY_LIMIT = 40
MORF_CHAT_MAX_HISTORY = 10
MORF_CHAT_MAX_MESSAGE_LEN = 600
MORF_CHAT_MAX_OUTPUT_TOKENS = 1024

QUICK_PROMPT_IDS = (
    "face_shape",
    "style_pick",
    "care_routine",
    "product_tips",
    "barber_visit",
)

QUICK_PROMPTS_UZ: dict[str, str] = {
    "face_shape": "Yuz shaklimga qaysi soch uslublari mos keladi?",
    "style_pick": "Menga zamonaviy va toza erkak soch uslubini tavsiya qil.",
    "care_routine": "Soch va bosh terisi uchun oddiy haftalik parvarish rejasi kerak.",
    "product_tips": "Qaysi styling mahsulotlari (wax, clay, pomade) men uchun yaxshi?",
    "barber_visit": "Barberga borishda nima deyishim va qanday ko'rsatma berishim kerak?",
}


def _format_context_block(context: dict[str, Any] | None) -> str:
    if not context:
        return "Foydalanuvchi konteksti: hali try-on tahlili yo'q — umumiy maslahat bering."

    lines: list[str] = ["Foydalanuvchi konteksti (Morph AI try-on/tahlil):"]
    mapping = (
        ("face_shape", "Yuz shakli"),
        ("hair_type", "Soch uzunligi"),
        ("hair_texture", "Soch teksturasi"),
        ("hair_color", "Soch rangi"),
        ("beard", "Soqol"),
        ("detected_gender", "Jins"),
        ("preferred_style_title", "Tanlangan uslub"),
        ("preferred_style_id", "Uslub ID"),
        ("summary_uz", "AI tahlil xulosasi"),
    )
    for key, label in mapping:
        val = context.get(key)
        if val is None or val == "":
            continue
        lines.append(f"- {label}: {val}")

    suggestions = context.get("suggestions")
    if isinstance(suggestions, list) and suggestions:
        titles = [
            str(s.get("title") or s.get("id") or "")
            for s in suggestions[:3]
            if isinstance(s, dict)
        ]
        titles = [t for t in titles if t]
        if titles:
            lines.append(f"- AI tavsiya etgan uslublar: {', '.join(titles)}")

    return "\n".join(lines)


def build_morf_chat_system_prompt(context: dict[str, Any] | None = None) -> str:
    """Morf AI chatbot uchun asosiy system prompt."""
    context_block = _format_context_block(context)
    return f"""Sen **Morf AI** — Mybarber ilovasidagi shaxsiy soch uslubi va parvarish maslahatchisisan.

## Roling
- Professional barber va tricholog maslahatchisi kabi gapir, lekin do'stona va sodda tilda.
- Foydalanuvchi try-on, yuz tahlili va uslub tanlash jarayonida yordam berasan.
- Mybarber ekotizimini bilasan: try-on, Studio rang tahriri, barberga yozilish, Master Card.

## Til
- Asosiy til: **o'zbek (lotin)**.
- Barber terminlari inglizcha bo'lishi mumkin (fade, undercut, taper, clipper guard #2 va h.k.) — qisqa izoh bilan.
- Rus yoki ingliz tilida savol bersa — shu tilga mos javob ber.

## Nima qilasan
1. Yuz shakliga mos soch uslublarini tavsiya qilish
2. Soch parvarishi: yuvish, namlovchi, styling tartibi
3. Mahsulot turlari (clay, pomade, sea salt spray) va qachon ishlatish
4. Barberga borishda qanday ko'rsatma berish (guard raqamlari, fade balandligi)
5. Try-on natijasini tushuntirish va keyingi qadamni taklif qilish
6. Soch rangi / Studio tahriri haqida umumiy maslahat (kuchli kimyo tavsiyasi emas)

## Cheklovlar (qat'iy)
- Tibbiy diagnoz, dori-darmon, allergiya davolash — **berma**. Shubhali holatda dermatologga murojaat qilishni ayt.
- Siyosat, dini bahs, kripto, dasturlash va Mybarberdan tashqari mavzular — qisqa rad et va soch/parvarishga qaytar.
- "Men AI man" deb takrorlama; tabiiy maslahatchi kabi gapir.
- Uzun esse emas: **2–5 qisqa paragraf** yoki kerak bo'lsa 3–5 bullet.
- Narxlarni uydan topib aytma — barber salon narxlari farq qiladi.

## Javob formati
- Birinchi jumla — to'g'ridan-to'g'ri javob yoki xulosa.
- Ro'yxat kerak bo'lsa `-` bullet ishlat.
- Oxirida ixtiyoriy **Keyingi qadam:** (1 ta aniq taklif: try-on, barber, parvarish).

{context_block}

Agar kontekst bo'lsa — undan foydalan; bo'lmasa umumiy, xavfsiz maslahat ber va try-on qilishni taklif qil."""
