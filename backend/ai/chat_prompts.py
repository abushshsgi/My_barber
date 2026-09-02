"""Morf AI chatbot — system prompt va kontekst yig'ish."""

from __future__ import annotations

from typing import Any

MORF_CHAT_DAILY_LIMIT = 40  # legacy alias — oylik token kvota ishlatiladi
MORF_CHAT_MAX_HISTORY = 24
MORF_CHAT_MAX_MESSAGE_LEN = 4000
MORF_CHAT_MAX_OUTPUT_TOKENS = 640
MORF_CHAT_VOICE_MAX_OUTPUT_TOKENS = 220
MORF_CHAT_MAX_THREADS = 200

QUICK_PROMPT_IDS = (
    "face_shape",
    "style_pick",
    "beard_style",
    "care_routine",
    "product_tips",
    "barber_visit",
)

QUICK_PROMPTS_UZ: dict[str, str] = {
    "face_shape": "Yuz shaklimga qaysi soch uslublari mos keladi?",
    "style_pick": "Menga zamonaviy va toza erkak soch uslubini tavsiya qil.",
    "beard_style": "Yuzimga mos soqol shaklini tavsiya qil.",
    "care_routine": "Soch va bosh terisi uchun oddiy haftalik parvarish rejasi kerak.",
    "product_tips": "Qaysi styling mahsulotlari (wax, clay, pomade) men uchun yaxshi?",
    "barber_visit": "Barberga borishda nima deyishim va qanday ko'rsatma berishim kerak?",
}

_FACE_SHAPE = {
    "oval": "oval",
    "round": "dumaloq",
    "square": "kvadrat",
    "heart": "yuraksimon",
    "oblong": "uzunchoq",
}
_HAIR_TYPE = {
    "short": "qisqa",
    "medium": "o'rtacha",
    "long": "uzun",
}
_HAIR_TEXTURE = {
    "straight": "to'g'ri",
    "wavy": "to'lqinsimon",
    "curly": "jingalak",
    "coily": "qattiq jingalak",
}
_HAIR_COLOR = {
    "black": "qora",
    "dark_brown": "to'q jigarrang",
    "brown": "jigarrang",
    "light_brown": "och jigarrang",
    "blonde": "sariq",
    "red": "qizg'ish",
    "gray": "oq/kulrang",
    "other": "boshqa",
}
_BEARD = {
    "none": "soqolsiz",
    "light": "yengil soqol",
    "full": "to'liq soqol",
}
_GENDER = {
    "male": "erkak",
    "female": "ayol",
    "unclear": "aniqlanmadi",
}


def _label(mapping: dict[str, str], value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    return mapping.get(raw.lower(), raw)


def _format_prefs_block(context: dict[str, Any] | None) -> str:
    if not context:
        return ""
    lines: list[str] = ["Foydalanuvchi sozlamalari:"]
    lang = str(context.get("reply_lang") or "").strip().lower()
    if lang in ("uz", "ru"):
        lines.append(
            "- Javob tili: "
            + ("o'zbek (lotin)" if lang == "uz" else "rus")
            + " — savol tilidan qat'i nazar shu tilda yoz."
        )
    style = str(context.get("reply_style") or "").strip().lower()
    if style == "short":
        lines.append("- Javob uslubi: qisqa (2–4 jumla, faqat eng muhim).")
    elif style == "barber":
        lines.append(
            "- Javob uslubi: barberga tayyor ko'rsatma "
            "(guard #, fade balandligi, clipper yo'nalishi — qisqa ro'yxat, 6–10 qator)."
        )
    elif style == "detailed":
        lines.append(
            "- Javob uslubi: batafsil lekin ixcham — nima, nima uchun, qanday qilish. "
            "Maksimum 8–12 jumla yoki qisqa ro'yxat; essay yozma."
        )
    else:
        lines.append(
            "- Javob uslubi: ixcham maslahat (standart). "
            "Savolga mos: oddiy — 2–4 jumla; murakkab — 5–7 jumla. Essay yozma."
        )
    gender = str(context.get("advice_gender") or context.get("user_gender") or "").strip().lower()
    if gender in ("male", "female"):
        lines.append(
            "- Maslahat jinsi: "
            + ("erkak" if gender == "male" else "ayol")
            + " uslublari va parvarishi ustuvor."
        )
    care_cond = str(context.get("care_condition") or "").strip()
    care_tex = str(context.get("care_texture") or "").strip()
    care_color = str(context.get("care_color_status") or "").strip()
    if care_cond or care_tex or care_color:
        lines.append(
            "- Soch profili (parvarish): "
            + ", ".join(
                x
                for x in (
                    f"holat={care_cond}" if care_cond else "",
                    f"tekstura={care_tex}" if care_tex else "",
                    f"rang={care_color}" if care_color else "",
                )
                if x
            )
            + ". Mahsulot va parvarish maslahatini shunga moslang."
        )
    if is_voice_mode(context):
        lines.append(
            "- Ovozli suhbat: faqat og'zaki aytiladigan matn. "
            "2–4 qisqa jumla, jami 40 so‘zdan oshirma. "
            "Markdown, ro'yxat, sarlavha va **qalin** yo'q. "
            "Adabiy o'zbek (Toshkent talaffuzi), turkcha yoki aralash sheva yo'q. "
            "Tabiiy suhbatdosh kabi, birinchi jumlada javob."
        )
    return "\n".join(lines) if len(lines) > 1 else ""


def is_voice_mode(context: dict[str, Any] | None) -> bool:
    if not context:
        return False
    raw = context.get("voice_mode")
    return raw is True or str(raw).strip().lower() in ("1", "true", "yes")


def _format_context_block(context: dict[str, Any] | None) -> str:
    prefs = _format_prefs_block(context)
    if not context:
        base = (
            "Foydalanuvchi konteksti: hali try-on tahlili yo'q. "
            "Umumiy, xavfsiz maslahat bering va try-on qilishni taklif qiling."
        )
        return f"{base}\n\n{prefs}".strip() if prefs else base

    lines: list[str] = [
        "Foydalanuvchi konteksti (shu suhbat uchun — boshqa suhbatlar bilan aralashtirma):"
    ]
    mapping = (
        ("face_shape", "Yuz shakli", _FACE_SHAPE),
        ("hair_type", "Soch uzunligi", _HAIR_TYPE),
        ("hair_texture", "Soch teksturasi", _HAIR_TEXTURE),
        ("hair_color", "Soch rangi", _HAIR_COLOR),
        ("beard", "Soqol", _BEARD),
        ("detected_gender", "Jins", _GENDER),
    )
    for key, label, vocab in mapping:
        pretty = _label(vocab, context.get(key))
        if pretty:
            lines.append(f"- {label}: {pretty}")

    for key, label in (
        ("preferred_style_title", "Tanlangan / try-on uslub"),
        ("preferred_style_id", "Uslub ID"),
        ("summary_uz", "AI tahlil xulosasi"),
    ):
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

    if len(lines) == 1:
        base = (
            "Foydalanuvchi konteksti: hali try-on tahlili yo'q. "
            "Umumiy, xavfsiz maslahat bering va try-on qilishni taklif qiling."
        )
        return f"{base}\n\n{prefs}".strip() if prefs else base

    lines.append(
        "Agar kontekst bo'lsa, javobni SHU ma'lumotga bog'la — umumiy shablon bilan cheklanma."
    )
    block = "\n".join(lines)
    return f"{block}\n\n{prefs}".strip() if prefs else block


def build_morf_chat_system_prompt(context: dict[str, Any] | None = None) -> str:
    """Morf AI chatbot uchun asosiy system prompt."""
    context_block = _format_context_block(context)
    return f"""Sen **Morf AI** — Mybarber ilovasidagi shaxsiy soch uslubi va parvarish maslahatchisisan.
Ohang: ChatGPT / Claude kabi — sokin, aniq, foydali. Do'stona, lekin marketing sloganlarisiz.

## Roling
- Professional barber va tricholog maslahatchisi kabi gapir, sodda tilda.
- Foydalanuvchi try-on, yuz tahlili va uslub tanlashida yordam berasan.
- Mybarber: try-on, Studio rang tahriri, barberga yozilish, Master Card.

## Til
- Asosiy til: **o'zbek (lotin)** (agar sozlamada boshqa til berilmasa).
- Barber terminlari inglizcha bo'lishi mumkin (fade, undercut, taper, clipper guard #2) — qisqa izoh bilan.
- Sozlamadagi javob tili ustuvor; aks holda savol tiliga moslash.

## Nima qilasan
1. Yuz shakliga mos soch uslublari
2. Soch parvarishi: yuvish, namlovchi, styling tartibi
3. Mahsulot turlari (clay, pomade, sea salt spray) va qachon ishlatish
4. Barberga ko'rsatma (guard raqamlari, fade balandligi)
5. Try-on natijasini tushuntirish va keyingi qadam
6. Soch rangi / Studio tahriri haqida umumiy maslahat (kuchli kimyo emas)

## Cheklovlar (qat'iy)
- Tibbiy diagnoz, dori, allergiya davolash — **berma**. Dermatologga yo'naltir.
- Siyosat, din, kripto, dasturlash va Mybarberdan tashqari mavzu — qisqa rad et va soch/parvarishga qaytar.
- "Men AI man" deb takrorlama.
- Narxlarni uydan aytma.
- Faqat **shu suhbat** tarixiga tayangan holda javob ber. Boshqa suhbatlarni o'ylab qo'shma.

## Javob chuqurligi
Matnli chatda **ixcham** javob ber: savolga mos uzunlik — oddiy savolga 2–4 jumla, murakkabga 5–8 jumla. Essay va takrorlamaslik.
- Birinchi jumla — to'g'ridan-to'g'ri javob.
- Kerak bo'lsa 1–2 qisqa sabab yoki amaliy qadam.
- Variantlar: eng ko'pi 2–3 ta, har biri 1 qator.
- Kontekst (yuz/soch) bo'lsa — qisqa bog'la.
- Standart rejimda 150–220 so‘zdan oshirma; “batafsil”da ham 320 so‘zdan oshirma.

## Javob formati
Agar ovozli suhbat yoqilgan bo'lsa — markdown yo'q, faqat qisqa og'zaki gaplar.
Aks holda o'qiladigan, ixcham markdown yoz:
- Birinchi jumla — to'g'ridan-to'g'ri javob.
- Kerak bo'lsa qisqa ro'yxat: `-` yoki `1.`
- Muhim so'zlarni **qalin** qil.
- Kod bloki deyarli ishlatma.
- Sozlamadagi uslubga rioya qil (qisqa / batafsil / barber ko'rsatma).
- Oxirida ixtiyoriy **Keyingi qadam:** (1 ta qator).

{context_block}"""
