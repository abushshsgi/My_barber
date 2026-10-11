"""INCI moddalarining qisqa, tekshirilgan izohi.

Katalogda har bir modda uchun alohida matn saqlanmaydi. Skan paytida
ma'lum moddalar shu lug'atdan, noma'lumlari esa skan tahlilidan to'ldiriladi.
"""

from __future__ import annotations

from typing import Any

# role, about, formula — lotin yozuvidagi o'zbekcha.
_FACTS: dict[str, dict[str, str]] = {
    "water": {
        "role": "Asos",
        "about": "Suv. Deyarli har bir suyuq formulaning asosiy qismi.",
        "formula": "Qolgan moddalarni eritadi va mahsulotni surtishga yaroqli qiladi. Sochga alohida davolash bermaydi.",
    },
    "sles": {
        "role": "Yuvuvchi",
        "about": "Sodium laureth sulfate — ko'pik hosil qiladigan yuvuvchi modda.",
        "formula": "Yog' va ifloslikni yuvadi. Ochilgan, quruq yoki shikastlangan sochni quritishi mumkin.",
    },
    "sls": {
        "role": "Yuvuvchi",
        "about": "Sodium lauryl sulfate — kuchli yuvuvchi modda.",
        "formula": "Teri va sochdagi yog'ni tez oladi. Quruq va ochilgan sochda ehtiyot talab qiladi.",
    },
    "salt": {
        "role": "Quyuqtirgich",
        "about": "Natriy xlorid — odatdagi tuz.",
        "formula": "Yuvuvchi aralashmani quyuqlashtiradi. Sochni oziqlantirmaydi.",
    },
    "capb": {
        "role": "Yumshoq yuvuvchi",
        "about": "Cocamidopropyl betaine — kokosdan olinadigan yordamchi yuvuvchi.",
        "formula": "Ko'pikni yumshatadi va sulfatning quritishini biroz kamaytiradi.",
    },
    "cocamide_dea": {
        "role": "Ko'pik",
        "about": "Cocamide DEA — ko'pik va quyuqlikni oshiradigan yordamchi modda.",
        "formula": "Yuvish hissini kuchaytiradi. O'zi namlantiruvchi emas.",
    },
    "glycerin": {
        "role": "Namlagich",
        "about": "Glitserin — namlikni ushlab turadigan modda.",
        "formula": "Soch va bosh terisidagi suvni saqlashga yordam beradi. Quruq soch uchun foydali.",
    },
    "polyquaternium": {
        "role": "Yumshatuvchi",
        "about": "Polyquaternium-7 — sochga yopishadigan konditsioner polimer.",
        "formula": "Tarashni yengillashtiradi va statikani kamaytiradi. Og'ir yog' emas.",
    },
    "fragrance": {
        "role": "Hid",
        "about": "Parfum — xushbo'y hid beradigan aralashma.",
        "formula": "Mahsulotga hid beradi. Sezgir bosh terisini qichitishi mumkin.",
    },
    "citric_acid": {
        "role": "pH",
        "about": "Limon kislotasi — formulaning kislotaliligini sozlaydi.",
        "formula": "Shampun pH ini sochga yaqinroq qiladi. Asosiy parvarish moddasi emas.",
    },
    "edta": {
        "role": "Barqarorlashtirgich",
        "about": "Disodium EDTA — suvdagi metall ionlarini bog'laydi.",
        "formula": "Formula buzilmasligi va ko'pik saqlanishi uchun qo'shiladi. Soch tolasi uchun faol modda emas.",
    },
    "panthenol": {
        "role": "Namlagich",
        "about": "Panthenol — B5 provitamini. Sochga namlik va silliq yuz beradi.",
        "formula": "Tolani yumshatadi va tarashni osonlashtiradi.",
    },
    "niacinamide": {
        "role": "Bosh terisi",
        "about": "Niacinamide — B3 vitamini. Bosh terisi to'sig'ini qo'llab-quvvatlaydi.",
        "formula": "Tirishish va yog' muvozanatiga yordam berishi mumkin.",
    },
    "silicone": {
        "role": "Silliqlagich",
        "about": "Silikon (masalan, dimethicone) soch yuzasini vaqtincha silliq qiladi.",
        "formula": "Chigal va quruq uchlarni yopadi. Ingichka yoki yog'li sochni og'irlashtirishi mumkin.",
    },
    "formaldehyde": {
        "role": "Konservant",
        "about": "Formaldegid yoki uni ajratadigan konservant.",
        "formula": "Mikrobga qarshi turadi, lekin soch va teri uchun tavsiya etilmaydi.",
    },
    "paraben": {
        "role": "Konservant",
        "about": "Parabenlar mahsulotni buzilishdan saqlaydi.",
        "formula": "Formula umrini uzaytiradi. Sochga parvarish effekti bermaydi.",
    },
    "drying_alcohol": {
        "role": "Erituvchi",
        "about": "Qurituvchi spirt (alcohol denat yoki isopropyl alcohol).",
        "formula": "Tez quritadi va yengil his beradi. Quruq sochdan namlikni olishi mumkin.",
    },
    "heavy_oil": {
        "role": "Yog'",
        "about": "Og'ir yog' (mineral oil yoki petrolatum).",
        "formula": "Quruq uchlarni yopadi. Yog'li bosh terisiga ortiqcha.",
    },
    "fatty_alcohol": {
        "role": "Yumshatuvchi",
        "about": "Yog'li spirt (cetyl yoki cetearyl alcohol). Oddiy spirt emas.",
        "formula": "Kremani quyuqlashtiradi va sochni yumshatadi.",
    },
    "btac": {
        "role": "Konditsioner",
        "about": "Behentrimonium chloride — sochni yumshatadigan konditsioner.",
        "formula": "Tarashni osonlashtiradi va uchlarni silliq qiladi.",
    },
    "bha": {
        "role": "Bosh terisi",
        "about": "Salisil kislotasi — bosh terisidagi ortiqcha hujayrani yechishga yordam beradi.",
        "formula": "Yog'li bosh terisi va kepekda ishlatiladi. Quruq sochda haddan oshmasin.",
    },
    "sci": {
        "role": "Yumshoq yuvuvchi",
        "about": "Sodium cocoyl isethionate — yumshoq yuvuvchi.",
        "formula": "Sulfatga qaraganda kamroq quritadi.",
    },
}


def is_known_fact(canon: str) -> bool:
    return bool(canon) and canon in _FACTS


def ingredient_fact(canon: str) -> dict[str, str]:
    row = _FACTS.get(canon or "")
    if row:
        return dict(row)
    return {
        "role": "Tarkib moddasi",
        "about": "Yorliqdagi tarkib ro'yxatida yozilgan modda.",
        "formula": "Formulaning bir qismi. Aniq vazifasi konsentratsiya va qolgan tarkibga bog'liq.",
    }


def hair_line(tone: str, helped: list[str], hurt: list[str], labels) -> str:
    if hurt:
        return f"Sizning {labels(hurt)} sochingizda bu modda ehtiyot talab qiladi."
    if helped:
        return f"Sizning {labels(helped)} sochingiz uchun foydali tomoni bor."
    if tone == "bad":
        return "Soch profilingizga yomon mos keladi."
    if tone == "good":
        return "Soch profilingiz bilan yaxshi mos keladi."
    if tone == "caution":
        return "Soch profilingiz uchun o'rtacha ta'sir."
    return "Soch holatingizga bevosita kuchli ta'sir qilmaydi."


def apply_note(row: dict[str, Any], note: dict[str, str] | None) -> None:
    """Lug'atda yo'q moddaga skan izohini yozadi. Lug'at matnini almashtirmaydi."""
    if not note or row.get("known"):
        return
    about = str(note.get("about_uz") or "").strip()
    formula = str(note.get("formula_uz") or "").strip()
    role = str(note.get("role_uz") or "").strip()
    hair = str(note.get("hair_uz") or "").strip()
    if about:
        row["about_uz"] = about[:280]
    if formula:
        row["formula_uz"] = formula[:280]
    if role:
        row["role_uz"] = role[:40]
    if hair:
        row["hair_uz"] = hair[:280]
