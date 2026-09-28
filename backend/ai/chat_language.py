"""Morf AI chat — oxirgi foydalanuvchi xabaridan javob tilini aniqlash.

Interfeys va sozlama tili hisobga olinmaydi. Qaytadigan kodlar:
`uz-latn`, `uz-cyrl`, `ru`, `other`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

ChatLangCode = str  # uz-latn | uz-cyrl | ru | other

_APOSTROPHE = "'ʻ’‘`ʼ"
_UZ_APOS = re.compile(rf"[oOgG][{_APOSTROPHE}]")
_LAT_WORD = re.compile(rf"[A-Za-z][A-Za-z{_APOSTROPHE}]*")
_CYR_WORD = re.compile(r"[А-Яа-яЁёЎўҚқҒғҲҳ]+")
_UZ_CYR_CHAR = re.compile(r"[ЎўҚқҒғҲҳ]")
_RU_ONLY_CHAR = re.compile(r"[ЫыЩщЪъЬь]")

# Inglizcha so'zlar — `q` harfi o'zbek belgisi emas.
_EN_Q_WORDS = frozenset(
    {
        "equal",
        "frequency",
        "quality",
        "question",
        "questions",
        "quick",
        "quickly",
        "quiet",
        "quite",
        "request",
        "required",
        "requirements",
        "square",
        "unique",
    }
)

# Barber atamalari til belgisi emas.
_JARGON = frozenset(
    {
        "buzz",
        "clipper",
        "crew",
        "crop",
        "fade",
        "guard",
        "ha",
        "hm",
        "ok",
        "okay",
        "pompadour",
        "quiff",
        "taper",
        "undercut",
        "yes",
        "no",
    }
)

_UZ_LATIN = frozenset(
    {
        "agar",
        "albatta",
        "alaykum",
        "assalomu",
        "ayting",
        "ber",
        "bering",
        "biri",
        "bilan",
        "bo'ladi",
        "bo'ldi",
        "bo'pti",
        "bor",
        "bosh",
        "boshqa",
        "boshqasi",
        "bu",
        "bugun",
        "chunki",
        "davom",
        "endi",
        "emas",
        "ham",
        "habar",
        "iltimos",
        "keldi",
        "kelmadi",
        "kerak",
        "kerakmi",
        "keyin",
        "lekin",
        "mayli",
        "maslahat",
        "men",
        "menga",
        "mening",
        "nima",
        "nimaga",
        "nega",
        "parvarish",
        "qachon",
        "qanaqa",
        "qanday",
        "qayerda",
        "qil",
        "qilaman",
        "qilay",
        "qilib",
        "qiling",
        "qilsam",
        "qilish",
        "qisqa",
        "rahmat",
        "salom",
        "sen",
        "senga",
        "shu",
        "shunaqa",
        "shunday",
        "siz",
        "sizga",
        "soch",
        "sochim",
        "sochlar",
        "soqol",
        "tavsiya",
        "terisi",
        "tushunarli",
        "uchun",
        "unda",
        "uslub",
        "va",
        "xabar",
        "xop",
        "xo'p",
        "yana",
        "yaxshi",
        "yordam",
        "yoki",
        "zo'r",
        "yomon",
        "yoq",
        "yo'q",
        "yuz",
        "yuzim",
        "uzun",
    }
)

_UZ_CYR = frozenset(
    {
        "агар",
        "беринглар",
        "беринг",
        "билан",
        "бор",
        "бу",
        "бугун",
        "эмас",
        "ҳам",
        "илтимос",
        "келди",
        "келмади",
        "керак",
        "лекин",
        "маслаҳат",
        "мен",
        "менга",
        "менинг",
        "нима",
        "нега",
        "парвариш",
        "қачон",
        "қандай",
        "кандай",
        "қаерда",
        "қил",
        "қилинг",
        "қисқа",
        "раҳмат",
        "салом",
        "сен",
        "сиз",
        "унда",
        "яна",
        "қайси",
        "сизга",
        "соч",
        "сочим",
        "соқол",
        "тавсия",
        "учун",
        "услуб",
        "ва",
        "яхши",
        "ёрдам",
        "ёки",
        "ёмон",
        "йўқ",
        "юз",
        "юзим",
        "узун",
        "чунки",
        "шу",
    }
)

_RU = frozenset(
    {
        "борода",
        "волос",
        "волосы",
        "где",
        "для",
        "еще",
        "ещё",
        "здравствуйте",
        "какая",
        "какой",
        "какое",
        "как",
        "когда",
        "короткая",
        "лицо",
        "лица",
        "мне",
        "меня",
        "можно",
        "надо",
        "нужен",
        "нужна",
        "нужно",
        "нужны",
        "подскажи",
        "посоветуй",
        "почему",
        "пожалуйста",
        "привет",
        "прическа",
        "пришла",
        "пришло",
        "расскажи",
        "скажи",
        "спасибо",
        "стиль",
        "стрижка",
        "это",
        "эта",
        "этот",
        "хочу",
        "сообщение",
        "не",
    }
)

# Lotin yozuvidagi ruscha funksiya so'zlari (mne nuzhna strizhka).
_RU_LATIN = frozenset(
    {
        "eto",
        "hochu",
        "kak",
        "mne",
        "menya",
        "mozhno",
        "nado",
        "nuzhen",
        "nuzhna",
        "nuzhno",
        "pochemu",
        "pozhaluysta",
        "privet",
        "skazhi",
        "soobshchenie",
        "spasibo",
        "strizhka",
        "zdravstvuyte",
    }
)

_EN = frozenset(
    {
        "advice",
        "am",
        "an",
        "and",
        "are",
        "bad",
        "beard",
        "came",
        "can",
        "could",
        "cut",
        "did",
        "do",
        "does",
        "face",
        "for",
        "good",
        "hair",
        "haircut",
        "hello",
        "help",
        "hey",
        "hi",
        "how",
        "i",
        "is",
        "long",
        "look",
        "me",
        "message",
        "my",
        "need",
        "not",
        "of",
        "or",
        "please",
        "recommend",
        "round",
        "short",
        "should",
        "style",
        "suit",
        "suits",
        "thank",
        "thanks",
        "that",
        "the",
        "this",
        "to",
        "want",
        "was",
        "we",
        "were",
        "what",
        "when",
        "where",
        "which",
        "who",
        "why",
        "with",
        "you",
        "your",
    }
)

_LABELS = {
    "uz-latn": "o'zbek (lotin)",
    "uz-cyrl": "o'zbek (kirill)",
    "ru": "rus",
    "en": "ingliz",
    "other": "xabar tili",
}


@dataclass(frozen=True)
class ChatLanguage:
    """Oxirgi xabar tili. `code=other` ichida ingliz ham, noma'lum til ham bo'ladi."""

    code: str
    label: str
    confident: bool


def _fold_apostrophe(token: str) -> str:
    out = token.lower()
    for ch in _APOSTROPHE[1:]:
        out = out.replace(ch, "'")
    return out


def _is_cyr(ch: str) -> bool:
    o = ord(ch)
    return 0x0400 <= o <= 0x04FF or ch in "ЎўҚқҒғҲҳ"


def _script_counts(text: str) -> tuple[int, int, int]:
    lat = cyr = other = 0
    for ch in text:
        if not ch.isalpha():
            continue
        if _is_cyr(ch):
            cyr += 1
        elif "a" <= ch.lower() <= "z":
            lat += 1
        else:
            other += 1
    return lat, cyr, other


def _lang(code: str, *, confident: bool, label: str | None = None) -> ChatLanguage:
    return ChatLanguage(code=code, label=label or _LABELS[code], confident=confident)


def detect_chat_language(text: str) -> ChatLanguage:
    """Bitta xabar tilini aniqlaydi. Interfeys tiliga qaramaydi."""
    sample = (text or "").strip()
    if not sample:
        return _lang("uz-latn", confident=False)

    lat_n, cyr_n, other_n = _script_counts(sample)
    scores = {"uz-latn": 0, "uz-cyrl": 0, "ru": 0, "en": 0}
    hits: list[str] = []

    if _UZ_APOS.search(sample):
        scores["uz-latn"] += 4
        hits.append("uz-latn")

    uz_cyr_chars = len(_UZ_CYR_CHAR.findall(sample))
    if uz_cyr_chars:
        scores["uz-cyrl"] += 4 + min(uz_cyr_chars, 4)
        hits.append("uz-cyrl")

    ru_only = len(_RU_ONLY_CHAR.findall(sample))
    if ru_only:
        scores["ru"] += 3 + min(ru_only, 3)
        hits.append("ru")

    for raw in _LAT_WORD.findall(sample):
        tok = _fold_apostrophe(raw)
        if tok in _UZ_LATIN or tok.replace("ʻ", "'") in _UZ_LATIN:
            scores["uz-latn"] += 3
            hits.append("uz-latn")
            continue
        if tok in _RU_LATIN:
            scores["ru"] += 3
            hits.append("ru")
            continue
        if tok in _EN:
            scores["en"] += 3
            hits.append("en")
            continue
        if tok in _JARGON or len(tok) < 3:
            continue
        if "q" in tok and tok not in _EN_Q_WORDS:
            scores["uz-latn"] += 2
            hits.append("uz-latn")
        elif tok.endswith("madi") and len(tok) >= 5:
            scores["uz-latn"] += 2
            hits.append("uz-latn")

    for raw in _CYR_WORD.findall(sample):
        tok = raw.lower()
        if tok in _UZ_CYR:
            scores["uz-cyrl"] += 3
            hits.append("uz-cyrl")
        elif tok in _RU:
            scores["ru"] += 3
            hits.append("ru")

    best = max(scores.values())
    if other_n >= 2 and other_n > lat_n and other_n > cyr_n and best < 6:
        return _lang("other", confident=True)

    if best <= 0:
        if cyr_n > lat_n and cyr_n > 0:
            if _UZ_CYR_CHAR.search(sample):
                return _lang("uz-cyrl", confident=True)
            return _lang("ru", confident=cyr_n >= 8)
        content_words = [
            _fold_apostrophe(w)
            for w in _LAT_WORD.findall(sample)
            if len(_fold_apostrophe(w)) >= 4 and _fold_apostrophe(w) not in _JARGON
        ]
        # Bitta qisqa noma'lum so'z ("unda") til emas — tarixdan to'ldiriladi.
        # Ikki so'z yoki uzun so'z (masalan "Merhaba") boshqa til hisoblanadi.
        if len(content_words) >= 2 or any(len(w) >= 7 for w in content_words):
            return _lang("other", confident=True)
        return _lang("uz-latn", confident=False)

    winners = [code for code, value in scores.items() if value == best]
    if len(winners) > 1:
        last = next((code for code in reversed(hits) if code in winners), winners[0])
        if set(winners) <= {"uz-latn", "uz-cyrl"}:
            last = "uz-cyrl" if cyr_n > lat_n else "uz-latn"
        elif "uz-cyrl" in winners and "ru" in winners:
            last = "uz-cyrl" if uz_cyr_chars else "ru"
        winners = [last]

    code = winners[0]
    if code == "en":
        return _lang("other", confident=True, label=_LABELS["en"])
    return _lang(code, confident=True)


def resolve_chat_language(message: str, history: list[Any] | None = None) -> ChatLanguage:
    """Oxirgi xabar aniq bo'lsa shu til. Aniq bo'lmasa oldingi user xabariga qarab to'ldiradi."""
    current = detect_chat_language(message)
    if current.confident:
        return current
    needle = (message or "").strip()
    for item in reversed(history or []):
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "").strip().lower()
        if role not in {"user", "human"}:
            continue
        content = str(item.get("content") or "").strip()
        if not content or content == needle:
            continue
        prev = detect_chat_language(content)
        if prev.confident:
            return prev
    return current


def language_directive(lang: ChatLanguage) -> str:
    """System promptga qo'yiladigan qat'iy til ko'rsatmasi."""
    if not lang.confident:
        return (
            "Oxirgi xabarda aniq til belgisi yo'q (masalan faqat uslub nomi yoki \"ok\"). "
            "Oldingi foydalanuvchi xabarida aniq til bo'lsa o'sha tilda davom et. "
            "Aks holda o'zbek (lotin) da yoz. Keyingi aniq xabar tilini darhol qabul qil."
        )
    if lang.code == "uz-latn":
        return (
            "Oxirgi xabar tili: **o'zbek (lotin)**. "
            "Javobni faqat o'zbek tilida, lotin alifbosida, adabiy imlo bilan yoz (o', g'). "
            "Kirillga va boshqa tilga o'tma."
        )
    if lang.code == "uz-cyrl":
        return (
            "Oxirgi xabar tili: **o'zbek (kirill)**. "
            "Javobni faqat o'zbek tilida, kirill alifbosida, adabiy imlo bilan yoz (ў, қ, ғ, ҳ). "
            "Lotinga va rus tiliga o'tma."
        )
    if lang.code == "ru":
        return (
            "Oxirgi xabar tili: **rus**. "
            "Javobni faqat rus tilida, adabiy imlo bilan yoz. O'zbek tiliga o'tma."
        )
    if lang.label == "ingliz":
        return (
            "Oxirgi xabar tili: **ingliz**. "
            "Javobni faqat ingliz tilida, to'g'ri imlo bilan yoz. O'zbek yoki rus tiliga o'tma."
        )
    return (
        "Oxirgi xabar o'zbek yoki rus emas. "
        "Javobni **aynan shu xabar tilida va yozuvida** ber. O'zbek yoki rus tiliga o'tma."
    )
