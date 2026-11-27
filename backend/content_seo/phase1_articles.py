"""Phase 1 guide copy. Rows stay draft until an editor sets status and published_at."""

from __future__ import annotations

AUTHOR = "MySaloon tahririyati"
REVIEWER = "MySaloon kontent tahriri"

EDITORIAL = {
    "uz": (AUTHOR, REVIEWER),
    "ru": ("Редакция MySaloon", "Редактор контента MySaloon"),
    "en": ("MySaloon editorial", "MySaloon content editor"),
}

FRENCH_CROP = "https://mysaloon.uz/hairstyles/men/personas/irland/french-crop.webp"
TEXTURED_CROP = "https://mysaloon.uz/hairstyles/men/personas/irland/textured-crop.webp"
SCAN_CARD = "https://mysaloon.uz/care/care-card-scan.jpg"

COSING_URL = "https://ec.europa.eu/growth/tools-databases/cosing/"
COSMETIC_REG_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009R1223"


def editorial(locale: str) -> tuple[str, str]:
    return EDITORIAL.get(locale, EDITORIAL["uz"])


def seed_phase1(apps, schema_editor=None):
    SeoArticle = apps.get_model("content_seo", "SeoArticle")
    for row in PHASE1:
        author, reviewer = editorial(row["locale"])
        SeoArticle.objects.update_or_create(
            slug=row["slug"],
            locale=row["locale"],
            defaults={
                "category": row["category"],
                "title": row["title"],
                "seo_title": row["seo_title"],
                "meta_description": row["meta_description"],
                "excerpt": row["excerpt"],
                "content": row["content"].strip(),
                "cover_image_path": row["cover_image_path"],
                "cover_alt": row["cover_alt"],
                "cover_width": row["cover_width"],
                "cover_height": row["cover_height"],
                "author": author,
                "reviewed_by": reviewer,
                "sources": row["sources"],
                "related_style_ids": row["related_style_ids"],
                "related_slugs": row["related_slugs"],
                "related_morf_service": row["related_morf_service"],
                "conversion_cta_href": row["conversion_cta_href"],
                "conversion_cta_label": row["conversion_cta_label"],
                "conversion_event": row["conversion_event"],
                "status": "draft",
                "published_at": None,
            },
        )


def cosmetic_sources(locale: str) -> list[dict]:
    titles = {
        "uz": (
            "Regulation (EC) No 1223/2009, Article 19 — ingredientlar ro'yxati",
            "European Commission CosIng — kosmetik ingredientlar bazasi",
        ),
        "ru": (
            "Регламент (EC) № 1223/2009, статья 19 — список ингредиентов",
            "CosIng Европейской комиссии — база косметических ингредиентов",
        ),
        "en": (
            "Regulation (EC) No 1223/2009, Article 19 — ingredient list",
            "European Commission CosIng — cosmetic ingredient database",
        ),
    }
    regulation, cosing = titles.get(locale, titles["uz"])
    return [
        {"title": regulation, "url": COSMETIC_REG_URL},
        {"title": cosing, "url": COSING_URL},
    ]

PHASE1: list[dict] = [
    {
        "slug": "virtual-soch-turmagini-sinab-korish",
        "locale": "uz",
        "category": "morf-ai",
        "title": "Virtual soch turmagini sinab ko'rish",
        "seo_title": "Virtual soch turmagini sinab ko'rish | Morf AI",
        "meta_description": "Selfie va katalogdagi uslub bilan yangi soch turmagini oldindan ko'ring. Morf AI try-on namuna beradi, sartarosh natijasini kafolatlamaydi.",
        "excerpt": "Salon oldidan bir nechta uslubni o'z rasmingizda solishtirish qarorni osonlashtiradi. Try-on namuna, tayyor natija emas.",
        "content": """Yangi soch turmagini so'zlash qiyin. "Qisqaroq" yoki "teksturali" deganingiz sartarosh xayolida boshqacha chiqishi mumkin. Virtual sinov shu bo'shliqni kamaytiradi: katalogdagi aniq modelni o'z selfiingiz ustida ko'rasiz va salonga borishdan oldin yoqmagan variantni chetga surasiz.

Bu sahifa MySaloon dagi Morf AI try-on ni qanday ochishni va natijani qanday o'qishni tushuntiradi. Rasmdagi French Crop katalog namunasi — sizning kelajakdagi sochingiz emas.

## Try-on nima qiladi

[Morf AI try-on](/ai-style) ikki narsani birlashtiradi: siz yuklagan selfie va katalogdan tanlangan uslub. Dastur shu uslubni rasmingizga qo'llab, oldindan ko'rish beradi. Natija yorug'lik, burchak va soch uzunligingizga qarab o'zgaradi. U sartarosh qaychini almashtirmaydi va "sizga 100% mos" degan hukm chiqarmaydi.

Agar avval umumiy tushuncha o'qimoqchi bo'lsangiz, [virtual try-on haqidagi sahifa](/morf-ai/try-on) xizmatni qisqa qilib ko'rsatadi. Sinashning o'zi [try-on ekranida](/ai-style) ochiladi.

## Qanday boshlash

1. [Try-on](/ai-style) ni oching va kameraga ruxsat bering yoki tayyor selfie yuklang.
2. Yuzingiz to'g'ri tursin, peshonangiz yopiq bo'lmasin, orqa fon juda qorong'i bo'lmasin.
3. Katalogdan bitta uslub tanlang. Masalan, [Textured Crop](/explore/men-textured-crop) yoki [French Crop](/explore/men-french-crop).
4. Natijani saqlang yoki yoqtirmasangiz boshqa modelga o'ting. Birinchi kadr oxirgi qaror emas.

Selfie boshqasining yuzida ishlatilmaydi. Agar rasm tiniq bo'lmasa, dastur uslubni "taxminan" qo'yadi — buni salon fotosuratidek o'qimang.

## Natijani qanday baholash

Yaxshi sinov uchun bitta kadr yetadi, lekin ikkita xil uzunlikni solishtirish foydali. Qisqa yonlar va uzunroq tepa sizda qanday turishini [Textured Crop qo'llanmasi](/guides/textured-crop-soch-turmagi) da yozib qo'ydik. Katalogning o'zi [soch uslublari](/explore) bo'limida.

E'tibor bering:

- Peshona va quloq ochiq bo'lsa, kontur aniqroq ko'rinadi.
- Shapkadagi yoki ho'l sochdagi selfie uslubni buzib ko'rsatishi mumkin.
- Rang va zichlik har doim ham fotosuratdagi kabi chiqmaydi. Sartarosh sochingizning haqiqiy holatini ko'radi.

Try-on dan keyin mahsulot tanlash alohida ish. Shampun yorlig'ini o'qish haqida [tarkibni tekshirish](/guides/shampun-tarkibini-tekshirish) maqolasida yozilgan. U yerda ham "mo'jiza ingredient" va'dasi yo'q.

## Savollar

### Try-on salon natijasini aynan ko'rsatadimi?

Yo'q. U katalog uslubining sizning rasmingizdagi namunasidir. Soch uzunligi, jingalak va sartarosh qo'li natijani o'zgartiradi.

### Qaysi selfie yaxshiroq?

Yuzingiz kameraga qaragan, yorug'lik tekis tushgan, peshonangiz ko'rinadigan bitta kadr. Guruhli rasm va qattiq filtr ishni qiyinlashtiradi.

### Pullik obunasiz ham ko'rish mumkinmi?

Try-on ekrani ochiladi. Generatsiya soni hisobingizdagi limitga bog'liq. Limit tugasa, ilova buni aytadi — natija "yashirincha" yaratilmaydi.

## Keyingi qadam

Yoqgan modelni topish uchun avval katalogni oching, keyin shu modelni o'zingizda sinang. French Crop rasmi shu maqolada namuna sifatida turibdi. O'zingizdagi ko'rinishni [try-on](/ai-style) da ko'rasiz.
""",
        "cover_image_path": FRENCH_CROP,
        "cover_alt": "French Crop — qisqa ponyakli erkaklar soch turmagining katalog surati.",
        "cover_width": 768,
        "cover_height": 1024,
        "related_style_ids": ["men-french-crop", "men-textured-crop"],
        "related_slugs": ["textured-crop-soch-turmagi", "shampun-tarkibini-tekshirish"],
        "related_morf_service": "try-on",
        "conversion_cta_href": "/ai-style",
        "conversion_cta_label": "Try-on ni ochish",
        "conversion_event": "tryon_cta_click",
        "sources": [],
    },
    {
        "slug": "virtual-soch-turmagini-sinab-korish",
        "locale": "ru",
        "category": "morf-ai",
        "title": "Как примерить стрижку виртуально",
        "seo_title": "Виртуальная примерка стрижки | Morf AI",
        "meta_description": "Посмотрите модель из каталога на своём селфи. Примерка Morf AI показывает образец, а не обещает результат барбера.",
        "excerpt": "Перед салоном спокойнее сравнить два силуэта на своём лице. Примерка — черновик, не готовая стрижка.",
        "content": """Новую стрижку трудно описать словами. «Покороче» и «с текстурой» барбер может понять иначе, чем вы. Виртуальная примерка сужает этот зазор: вы берёте конкретную модель из каталога и смотрите её на своём селфи до визита.

Здесь — как открыть try-on Morf AI в MySaloon и как читать картинку. Фото French Crop наверху — снимок из каталога, а не ваша будущая стрижка.

## Что делает примерка

[Try-on](/ai-style) соединяет ваше селфи и выбранную модель. Программа накладывает силуэт на фото. Свет, угол и длина ваших волос меняют картинку. Это не замена ножницам и не вердикт «вам точно подойдёт».

Короткое описание услуги лежит на [странице try-on](/morf-ai/try-on). Сама примерка открывается на [экране try-on](/ai-style).

## Как начать

1. Откройте [try-on](/ai-style) и разрешите камеру или загрузите готовое селфи.
2. Лицо прямо, лоб открыт, фон не провален в темноту.
3. Выберите одну модель, например [Textured Crop](/explore/men-textured-crop) или [French Crop](/explore/men-french-crop).
4. Сохраните удачный кадр или сразу перейдите к другой модели. Первый результат не обязан быть последним.

Чужое лицо использовать не нужно. Если фото мутное, наложение будет приблизительным — не читайте его как фото из барбершопа.

## Как смотреть на результат

Полезно сравнить два разных силуэта, а не останавливаться на одном кадре. Про короткие бока и текстуру сверху написано в [гайде Textured Crop](/guides/textured-crop-soch-turmagi). Весь каталог — в разделе [стрижек](/explore).

Имеет смысл помнить:

- Открытые лоб и уши делают контур понятнее.
- Селфи в шапке или с мокрыми волосами искажает форму.
- Цвет и густота на фото не всегда совпадают с тем, что сделает барбер.

Подбор шампуня — отдельная задача. Как читать этикетку, без обещания «чудо-состава», — в материале [проверка состава](/guides/shampun-tarkibini-tekshirish).

## Вопросы

### Примерка покажет точную стрижку из салона?

Нет. Это образец модели каталога на вашем фото. Длина, завиток и рука барбера изменят итог.

### Какое селфи лучше?

Один кадр: лицо к камере, ровный свет, виден лоб. Групповое фото и тяжёлый фильтр мешают.

### Можно ли смотреть без подписки?

Экран try-on открывается. Число генераций зависит от лимита аккаунта. Если лимит кончился, приложение говорит об этом прямо.

## Дальше

Сначала откройте каталог, потом примерьте выбранную модель на себе. Снимок French Crop в этой статье — только пример. Свой вариант смотрите в [try-on](/ai-style).
""",
        "cover_image_path": FRENCH_CROP,
        "cover_alt": "French Crop — каталожное фото короткой мужской стрижки с чёлкой.",
        "cover_width": 768,
        "cover_height": 1024,
        "related_style_ids": ["men-french-crop", "men-textured-crop"],
        "related_slugs": ["textured-crop-soch-turmagi", "shampun-tarkibini-tekshirish"],
        "related_morf_service": "try-on",
        "conversion_cta_href": "/ai-style",
        "conversion_cta_label": "Открыть try-on",
        "conversion_event": "tryon_cta_click",
        "sources": [],
    },
    {
        "slug": "virtual-soch-turmagini-sinab-korish",
        "locale": "en",
        "category": "morf-ai",
        "title": "Try a haircut on your own photo",
        "seo_title": "Virtual haircut try-on | Morf AI",
        "meta_description": "Preview a catalog haircut on your selfie. Morf AI try-on is a sample, not a promise of the salon result.",
        "excerpt": "Comparing two shapes on your own face is easier than describing a cut in the chair. The preview is a draft.",
        "content": """A new haircut is hard to describe. “Shorter” and “more texture” can mean different things once you sit in the chair. A virtual try-on narrows that gap: you pick a specific catalog model and see it on your selfie before the appointment.

This page explains how to open Morf AI try-on in MySaloon and how to read the picture. The French Crop photo above is a catalog still, not your future haircut.

## What try-on does

[Try-on](/ai-style) combines your selfie with one catalog style. The app places that shape on your photo. Light, angle, and your real hair length change the picture. It does not replace the barber and it does not decide that a cut “definitely suits you.”

A short overview lives on the [try-on page](/morf-ai/try-on). The tool itself opens on the [try-on screen](/ai-style).

## How to start

1. Open [try-on](/ai-style) and allow the camera, or upload a selfie you already have.
2. Face the lens, keep your forehead visible, and avoid a very dark background.
3. Choose one model, such as [Textured Crop](/explore/men-textured-crop) or [French Crop](/explore/men-french-crop).
4. Keep a frame you like, or move on. The first result does not have to be the last.

Do not use someone else’s face. A blurry photo produces a rough overlay — do not treat it like a salon photograph.

## How to judge the result

Compare two different shapes instead of stopping at one frame. Short sides with texture on top are described in the [Textured Crop guide](/guides/textured-crop-soch-turmagi). The full catalog is under [hairstyles](/explore).

A few practical limits:

- An open forehead and visible ears make the outline easier to read.
- A hat or wet hair will distort the shape.
- Color and density in the preview will not always match what the barber can cut.

Choosing a shampoo is a separate step. How to read a label, without a miracle-ingredient claim, is in [checking a shampoo formula](/guides/shampun-tarkibini-tekshirish).

## Questions

### Will try-on match the salon result exactly?

No. It is a catalog model placed on your photo. Length, curl, and the barber’s hand change the outcome.

### What selfie works better?

One frame, face toward the camera, even light, forehead visible. A group photo or a heavy filter makes the overlay worse.

### Can I look without a paid plan?

The try-on screen opens. How many previews you can generate depends on your account limit. If the limit is used up, the app says so.

## Next step

Open the catalog, then try the model on yourself. The French Crop photo in this article is only an example. See your own version in [try-on](/ai-style).
""",
        "cover_image_path": FRENCH_CROP,
        "cover_alt": "French Crop — catalog photo of a short men's haircut with a fringe.",
        "cover_width": 768,
        "cover_height": 1024,
        "related_style_ids": ["men-french-crop", "men-textured-crop"],
        "related_slugs": ["textured-crop-soch-turmagi", "shampun-tarkibini-tekshirish"],
        "related_morf_service": "try-on",
        "conversion_cta_href": "/ai-style",
        "conversion_cta_label": "Open try-on",
        "conversion_event": "tryon_cta_click",
        "sources": [],
    },
    {
        "slug": "textured-crop-soch-turmagi",
        "locale": "uz",
        "category": "styles",
        "title": "Textured Crop soch turmagi",
        "seo_title": "Textured Crop — qisqa teksturali erkaklar turmagi",
        "meta_description": "Textured Crop: tepa hajmli, yonlar qisqa. Katalog modeli, parvarish va MySaloon try-on yo'li.",
        "excerpt": "Textured Crop — tepada tekstura, yonlarda qisqa kontur. MySaloon katalogidagi model shu nom bilan turibdi.",
        "content": """Textured Crop qisqa erkaklar turmagi. Tepada soch biroz qoldiriladi va qo'l bilan yoki yengil vosita bilan tekstura beriladi. Yonlar va orqa qism ancha qisqa, shuning uchun siluet yig'iq turadi. MySaloon katalogidagi tavsif ham shunday: hajm tepada, yonlar qisqa, yosh va zamonaviy ko'rinish.

Bu maqola shu aniq model haqida. Rasm — katalogdagi [Textured Crop](/explore/men-textured-crop) surati, try-on dan chiqqan natija emas.

## Qanday ko'rinadi

Tepa odatda bir necha santimetr qoladi, uchlari bir xil tekis chiziqda emas. Yonlar teriga yopishib turadigan darajada qisqa bo'lishi shart emas: yumshoq o'tish ham, aniqroq chiziq ham bo'ladi. Bu farqni sartarosh sizning sochingiz zichligiga qarab qo'yadi.

Agar tepani butunlay tekis yotqizmoqchi bo'lsangiz, bu boshqa uslub. Textured Crop ning ma'nosi — tepa biroz "tirik" turishi.

Modelni kartochkada ko'ring: [Textured Crop](/explore/men-textured-crop). O'z rasmingizda esa [shu modelning try-on sahifasi](/explore/men-textured-crop/try) ochiladi. Umumiy sinov tartibi [virtual try-on qo'llanmasida](/guides/virtual-soch-turmagini-sinab-korish).

## Kimga qulay

Bu turmak sochini tepada bir oz qoldirmoqchi, lekin yonlari yig'iq bo'lishini xohlaganlar uchun qulay. Ingichka sochda tekstura kuchsizroq ko'rinishi mumkin — buni katalog surati yashirmaydi, try-on esa faqat namuna beradi. Qalin yoki biroz to'lqinli sochda tepa osonroq shakl oladi. Bu qoida emas, kuzatuv.

Yuz shakli bo'yicha "faqat shu kesim mos" degan ro'yxat bermaymiz. Sartarosh peshona, quloq va soch o'sish yo'nalishini ko'rib turib kesadi. Try-on shu suhbatdan oldin siluetni ko'rsatadi.

Yaqin qarindosh uslub — [French Crop](/explore/men-french-crop): u yerda old qism qisqaroq ponyak bilan o'qiladi. Farqni ikkala kartochkani ochib solishtirish mumkin.

## Qanday turishini saqlash

Ertalab tepani nam qo'l yoki ozgina matte vosita bilan ko'tarish odatda yetadi. Sochni yaltiratib yopishtirib qo'yadigan qalin mum teksturani yopib qo'yishi mumkin. Yonlar o'sib, tepa bilan tenglashib ketganda siluet yo'qoladi — ko'pchilik shu paytda qayta kesdiradi. Aniq hafta sonini aytmaymiz: soch o'sish tezligi har xil.

Yuvishdan keyin soch quruq yoki og'ir tortsa, shampun yorlig'ini alohida o'qing. [Tarkibni tekshirish](/guides/shampun-tarkibini-tekshirish) shu ish uchun. U diagnostika emas.

## Savollar

### Katalogdagi rasm mening natijammi?

Yo'q. Bu MySaloon dagi `men-textured-crop` modelining katalog surati. Sizdagi ko'rinishni [try-on](/explore/men-textured-crop/try) da ko'rasiz.

### Har kuni fen kerakmi?

Shart emas. Ko'pchilik quruq sochni qo'l bilan tartibga keltiradi. Fen ishlatsangiz, past harorat va qisqa vaqt kifoya — sochni quritish usuli alohida tibbiy maslahat emas.

### Ayollar ham kesdirishi mumkinmi?

Model erkaklar katalogida. Qisqa teksturali kesimni boshqa uzunlikda ham so'rash mumkin, lekin bu sahifadagi try-on aynan shu erkaklar modeliga ulangan.

## Sinab ko'rish

Avval [kartochkani](/explore/men-textured-crop) oching. Yoqsa, [try-on](/explore/men-textured-crop/try) ga o'ting. Boshqa qisqa uslublar [katalogda](/explore).
""",
        "cover_image_path": TEXTURED_CROP,
        "cover_alt": "Textured Crop — tepada tekstura, yonlari qisqa erkaklar soch turmagining katalog surati.",
        "cover_width": 768,
        "cover_height": 1024,
        "related_style_ids": ["men-textured-crop", "men-french-crop"],
        "related_slugs": ["virtual-soch-turmagini-sinab-korish", "shampun-tarkibini-tekshirish"],
        "related_morf_service": "try-on",
        "conversion_cta_href": "/explore/men-textured-crop/try",
        "conversion_cta_label": "Textured Crop ni sinash",
        "conversion_event": "tryon_cta_click",
        "sources": [
            {
                "title": "MySaloon katalogi — men-textured-crop",
                "url": "https://mysaloon.uz/explore/men-textured-crop",
            }
        ],
    },
    {
        "slug": "textured-crop-soch-turmagi",
        "locale": "ru",
        "category": "styles",
        "title": "Стрижка Textured Crop",
        "seo_title": "Textured Crop — короткая текстурная стрижка",
        "meta_description": "Textured Crop: объём сверху и короткие бока. Модель каталога MySaloon и маршрут try-on.",
        "excerpt": "Textured Crop — текстура на макушке и короткий контур по бокам. В каталоге MySaloon модель называется так же.",
        "content": """Textured Crop — короткая мужская стрижка. На макушке оставляют несколько сантиметров и придают им текстуру рукой или лёгким средством. Бока и затылок заметно короче, поэтому силуэт собранный. В каталоге MySaloon так и сказано: объём сверху, короткие бока, молодой современный вид.

Речь о конкретной модели. Фото сверху — кадр [Textured Crop](/explore/men-textured-crop) из каталога, не результат чьей-то примерки.

## Как это выглядит

Верх обычно не стригут в одну ровную полку: кончики чуть разной длины. Бока не обязаны быть «под ноль» — переход может быть мягким или более чётким. Барбер ставит эту границу по густоте ваших волос.

Если хочется полностью гладкой макушки, это уже другая стрижка. Смысл Textured Crop в том, что верх остаётся немного живым.

Карточка модели: [Textured Crop](/explore/men-textured-crop). На своём фото откройте [try-on этой модели](/explore/men-textured-crop/try). Общий порядок примерки — в [гайде про виртуальный try-on](/guides/virtual-soch-turmagini-sinab-korish).

## Кому удобно

Стрижка удобна, если хочется оставить длину сверху и убрать объём по бокам. На тонких волосах текстура читается слабее — каталожное фото этого не скрывает, а try-on даёт только образец. На плотных или слегка волнистых волосах верх обычно держит форму легче. Это наблюдение, не правило.

Мы не раздаём список «только для такой формы лица». Барбер видит лоб, уши и направление роста. Примерка показывает силуэт до этого разговора.

Близкий сосед — [French Crop](/explore/men-french-crop): там передняя часть читается как короткая чёлка. Разницу видно, если открыть обе карточки.

## Как носить

Утром часто хватает влажных рук или капли матового средства. Плотный воск, который склеивает волосы в блеск, прячет текстуру. Когда бока отрастают и сравниваются с верхом, силуэт пропадает — многие тогда идут на коррекцию. Точное число недель не называем: волосы растут по-разному.

Если после мытья волосы кажутся сухими или тяжёлыми, этикетку шампуня читайте отдельно. Для этого есть [проверка состава](/guides/shampun-tarkibini-tekshirish). Это не диагноз.

## Вопросы

### Это фото — мой результат?

Нет. Это каталожный кадр модели `men-textured-crop`. Свой вариант смотрите в [try-on](/explore/men-textured-crop/try).

### Нужен ли фен каждый день?

Не обязательно. Многие укладывают сухие волосы руками. Если фен всё же нужен, достаточно короткого времени на невысокой температуре. Это бытовой совет, не медицинский.

### Можно ли просить такую форму не из мужского каталога?

Модель лежит в мужском каталоге, и try-on на этой странице ведёт именно на неё. Похожую короткую текстуру можно обсудить с барбером отдельно.

## Примерить

Сначала откройте [карточку](/explore/men-textured-crop). Если силуэт нравится, перейдите в [try-on](/explore/men-textured-crop/try). Другие короткие модели — в [каталоге](/explore).
""",
        "cover_image_path": TEXTURED_CROP,
        "cover_alt": "Textured Crop — каталожное фото мужской стрижки с текстурой сверху и короткими боками.",
        "cover_width": 768,
        "cover_height": 1024,
        "related_style_ids": ["men-textured-crop", "men-french-crop"],
        "related_slugs": ["virtual-soch-turmagini-sinab-korish", "shampun-tarkibini-tekshirish"],
        "related_morf_service": "try-on",
        "conversion_cta_href": "/explore/men-textured-crop/try",
        "conversion_cta_label": "Примерить Textured Crop",
        "conversion_event": "tryon_cta_click",
        "sources": [
            {
                "title": "Каталог MySaloon — men-textured-crop",
                "url": "https://mysaloon.uz/explore/men-textured-crop",
            }
        ],
    },
    {
        "slug": "textured-crop-soch-turmagi",
        "locale": "en",
        "category": "styles",
        "title": "The Textured Crop haircut",
        "seo_title": "Textured Crop — a short textured men's cut",
        "meta_description": "Textured Crop keeps texture on top and the sides short. See the MySaloon catalog model and its try-on route.",
        "excerpt": "Textured Crop is texture on top with a short side contour. The MySaloon catalog uses that name for this model.",
        "content": """Textured Crop is a short men's haircut. The top is left long enough to move, then broken up with your hands or a light product. The sides and back are clearly shorter, so the outline stays neat. The MySaloon catalog describes it the same way: volume on top, short sides, a young modern shape.

This article is about that specific model. The photo is the catalog still for [Textured Crop](/explore/men-textured-crop), not someone's try-on result.

## What it looks like

The top is usually not cut into one blunt shelf. The ends are slightly uneven on purpose. The sides do not have to be shaved: the blend can be soft or sharper. A barber sets that line from how thick your hair is.

If you want the top combed completely flat, that is a different cut. Textured Crop is meant to keep a little life on top.

Open the card: [Textured Crop](/explore/men-textured-crop). On your own photo, use [this model's try-on](/explore/men-textured-crop/try). The general try-on steps are in the [virtual try-on guide](/guides/virtual-soch-turmagini-sinab-korish).

## Who it is practical for

It is a practical cut if you want to keep some length on top and take weight off the sides. Fine hair may show less texture — the catalog photo does not hide that, and try-on is only a sample. Thicker or slightly wavy hair often holds the top more easily. That is an observation, not a rule.

There is no list here of “only this face shape.” A barber sees your forehead, ears, and growth pattern. Try-on shows the outline before that conversation.

A close neighbor is [French Crop](/explore/men-french-crop), where the front reads as a short fringe. Open both cards if you want to compare them.

## How to keep the shape

In the morning, damp hands or a small amount of matte product is often enough. A heavy wax that glues the hair into a shine will hide the texture. When the sides grow out and meet the top, the outline disappears — that is when many people book a refresh. There is no universal number of weeks. Hair grows at different speeds.

If hair feels dry or heavy after washing, read the shampoo label separately. [Checking a formula](/guides/shampun-tarkibini-tekshirish) is for that. It is not a diagnosis.

## Questions

### Is the catalog photo my result?

No. It is the catalog still for `men-textured-crop`. See your own version in [try-on](/explore/men-textured-crop/try).

### Do I need a blow-dryer every day?

No. Many people shape dry hair with their hands. If you do use a dryer, a short time on a lower heat is enough. That is everyday advice, not a medical instruction.

### Is this only in the men's catalog?

Yes. This page's try-on opens that men's model. A similar short textured shape can still be discussed with a barber on its own.

## Try it

Open the [card](/explore/men-textured-crop) first. If the shape looks right, go to [try-on](/explore/men-textured-crop/try). Other short cuts are in the [catalog](/explore).
""",
        "cover_image_path": TEXTURED_CROP,
        "cover_alt": "Textured Crop — catalog photo of a men's cut with texture on top and short sides.",
        "cover_width": 768,
        "cover_height": 1024,
        "related_style_ids": ["men-textured-crop", "men-french-crop"],
        "related_slugs": ["virtual-soch-turmagini-sinab-korish", "shampun-tarkibini-tekshirish"],
        "related_morf_service": "try-on",
        "conversion_cta_href": "/explore/men-textured-crop/try",
        "conversion_cta_label": "Try Textured Crop",
        "conversion_event": "tryon_cta_click",
        "sources": [
            {
                "title": "MySaloon catalog — men-textured-crop",
                "url": "https://mysaloon.uz/explore/men-textured-crop",
            }
        ],
    },
    {
        "slug": "shampun-tarkibini-tekshirish",
        "locale": "uz",
        "category": "hair-advisor",
        "title": "Shampun tarkibini tekshirish",
        "seo_title": "Shampun tarkibini tekshirish | Hair Advisor",
        "meta_description": "Shampun yorlig'idagi ingredientlar ro'yxatini qanday o'qish mumkin. Hair Advisor skaneri nomlarni tushuntiradi, tashxis qo'ymaydi.",
        "excerpt": "Yorliqni o'qish — tarkibdagi birinchi nomlar odatda ko'proq ulushda. Skaner yordam beradi, lekin shifokor emas.",
        "content": """Shampun shishasining orqasida lotincha nomlar uzun qator bo'lib turadi. Hammasini yodlash shart emas. Foydali qadam — ro'yxatning tartibini tushunish va o'zingiz sezayotgan narsani (quruqlik, og'irlik, qichishish) shu ro'yxat bilan solishtirish. MySaloon dagi Hair Advisor shu o'qishga yordam beradi. U soch kasalligini aniqlamaydi va "shu shampun sochingizni tuzatadi" demaydi.

Tepadagi rasm — ilovadagi parvarish kartasi uchun chizilgan namuna. Bu haqiqiy skaner natijasi emas va undagi flakon aniq bir shampun emas.

## Yorliq qanday tartibda yoziladi

Yevropa Ittifoqining kosmetika reglamentida (EC 1223/2009, 19-modda) ingredientlar, odatda, qo'shilgan paytdagi og'irlik bo'yicha kamayib boradi. Taxminan 1 foizdan kam ulushdagi moddalar esa shu ro'yxatdan keyin istalgan tartibda turishi mumkin. Shuning uchun birinchi uch-to'rtta nom formulasining asosiy qismini ko'proq aytadi, oxiridagi uzun dumi esa har doim ham "asosiy ta'sir" degani emas.

Nomlarning rasmiy yozilishi uchun Yevropa Komissiyasining CosIng bazasi bor. U yerda ingredientning INCI nomi qidiriladi. Baza ham "sizga mos" degan baho bermaydi.

## Hair Advisor nima qiladi

Ishlab turgan yo'l shunday:

1. [Ingredient skaneri](/ai-style/care/ingredient) ni oching. Qisqa tushuntirish [shu sahifada](/morf-ai/ingredient-scanner).
2. Shampun shtrix-kodini yoki yorliqni ko'rsating. Ilova topilgan mahsulotni va o'qiy olgan ingredient nomlarini chiqaradi.
3. Tanish nomlar yonida oddiy izoh bo'ladi. Tushunarsiz qatorni o'zingiz CosIng da tekshirishingiz mumkin.

Hozircha va'da qilmaydigan narsalar:

- Har qanday yorliq, har qanday tilda, birinchi urinishda to'liq o'qiladi deb bo'lmaydi. Yorliq yaltiroq, mayda yoki qirqilgan bo'lsa, natija chala qoladi.
- Katalogda yo'q mahsulot "topilmadi" holatida qolishi mumkin. Bu yomon shampun degani emas.
- Skaner teri tashxisi, allergiya tekshiruvi yoki davolash rejasi emas. Qichishish, to'kilish yoki yara bo'lsa, shifokorga murojaat qiling.

Yangi, hali telefonda alohida tekshirilmagan skaner imkoniyatlarini ishlayapti deb yozmaymiz.

## Nimaga e'tibor berish mumkin

Sulfatlar, silikonlar yoki "tabiiy" degan so'zning o'zi yaxshi yoki yomon degan hukm emas. Ba'zi odamlar yuvishdan keyin bosh terisi tarang bo'lsa, yumshoqroq yuvuvchi asosli shampunni sinab ko'radi. Boshqalari yog'li ildizni tozalashni xohlaydi va kuchliroq yuvish ularga mos keladi. Buni faqat yorliqdan bilib bo'lmaydi: soch qanday sezilayotgani ham kerak.

Agar yangi turmak tanlayotgan bo'lsangiz, parvarishni uslubdan alohida yopmang. [Textured Crop](/guides/textured-crop-soch-turmagi) kabi qisqa tekstura ko'pincha yengil, yaltiramaydigan vosita bilan yuradi. Turmakning o'zi esa [try-on](/guides/virtual-soch-turmagini-sinab-korish) da ko'riladi.

## Savollar

### Birinchi ingredient suv bo'lsa, shampun yomonmi?

Yo'q. Ko'p yuvish vositalarining asosi suv. Undan keyingi nomlar formulasining qolgan qismi haqida ko'proq gapiradi.

### Skaner allergiyani oldindan aytadimi?

Yo'q. U nomlarni tushuntiradi. Allergiya shaxsiy — yorliq va shifokor buni skanerdan yaxshiroq biladi.

### Natija chiqmasa nima qilish kerak?

Yorliqni tekis yorug'likda qayta ko'rsating yoki shtrix-kodni qo'lda kiriting, agar maydon bo'lsa. Topilmasa, ingredientlar ro'yxatini o'zingiz o'qing. Bo'sh natija ham foydali ma'lumot: katalog bu idishni tanimadi.

## Ochish

[Hair Advisor skaneri](/ai-style/care/ingredient) mavjud mahsulot yorlig'i bilan ishlaydi. Natijani parvarish qarorining bir bo'lagi sifatida o'qing, yagona dalil sifatida emas.
""",
        "cover_image_path": SCAN_CARD,
        "cover_alt": "MySaloon parvarish kartasi: telefonda mahsulot skaneri namunasi, haqiqiy tahlil natijasi emas.",
        "cover_width": 1152,
        "cover_height": 864,
        "related_style_ids": ["men-textured-crop"],
        "related_slugs": ["virtual-soch-turmagini-sinab-korish", "textured-crop-soch-turmagi"],
        "related_morf_service": "scan",
        "conversion_cta_href": "/ai-style/care/ingredient",
        "conversion_cta_label": "Skanerni ochish",
        "conversion_event": "scan_cta_click",
        "sources": cosmetic_sources("uz"),
    },
    {
        "slug": "shampun-tarkibini-tekshirish",
        "locale": "ru",
        "category": "hair-advisor",
        "title": "Как проверить состав шампуня",
        "seo_title": "Состав шампуня — как читать этикетку | Hair Advisor",
        "meta_description": "Как читать список ингредиентов на шампуне. Сканер Hair Advisor поясняет названия и не ставит диагноз.",
        "excerpt": "Первые строки этикетки обычно занимают большую долю формулы. Сканер помогает читать, но не заменяет врача.",
        "content": """На обороте флакона длинная строка латинских названий. Запоминать её целиком не нужно. Полезнее понять порядок списка и сопоставить его с тем, что вы сами чувствуете: сухость, тяжесть, зуд. Hair Advisor в MySaloon помогает это прочитать. Он не определяет болезнь волос и не обещает, что шампунь «починит» их.

Картинка сверху — иллюстрация карточки ухода в приложении. Это не настоящий результат сканера и не конкретный шампунь.

## В каком порядке пишут состав

В регламенте ЕС о косметике (EC 1223/2009, статья 19) ингредиенты обычно идут по убыванию веса на момент добавления. Вещества примерно ниже 1% можно перечислять после этого блока в любом порядке. Поэтому первые три-четыре названия больше говорят об основе, а длинный хвост не всегда означает «главное действие».

Официальные написания лежат в базе CosIng Европейской комиссии. Там ищут INCI-имя. База тоже не говорит «вам подходит».

## Что делает Hair Advisor

Рабочий путь такой:

1. Откройте [сканер состава](/ai-style/care/ingredient). Короткое описание — на [этой странице](/morf-ai/ingredient-scanner).
2. Покажите штрих-код или этикетку. Приложение покажет найденный продукт и те названия, которые смогло прочитать.
3. Рядом со знакомыми именами будет короткое пояснение. Непонятную строку можно сверить в CosIng.

Чего мы сейчас не обещаем:

- Не каждая этикетка, не на каждом языке, считывается целиком с первой попытки. Бликующий, мелкий или обрезанный текст останется неполным.
- Продукта может не быть в каталоге. Это не приговор шампуню.
- Сканер не проверяет аллергию и не назначает лечение. При зуде, выпадении или ране на коже нужен врач.

Возможности сканера, которые ещё не проверены на телефоне, мы не описываем как уже работающие.

## На что смотреть без ярлыков «полезно / вредно»

Сульфаты, силиконы или слово «натуральный» сами по себе не приговор и не награда. Кому-то после мытья стягивает кожу — он пробует более мягкую моющую основу. Кому-то нужна более сильная очистка жирных корней. По одной этикетке этого не решить: важно, как волосы ощущаются.

Если вы как раз выбираете стрижку, уход не закрывает вопрос формы. Короткая текстура вроде [Textured Crop](/guides/textured-crop-soch-turmagi) чаще живёт с лёгким средством без блеска. Саму форму смотрят в [try-on](/guides/virtual-soch-turmagini-sinab-korish).

## Вопросы

### Если первым стоит вода, шампунь плохой?

Нет. Основа большинства моющих средств — вода. Следующие названия говорят об остальной формуле больше.

### Сканер предупредит об аллергии?

Нет. Он поясняет имена. Аллергия личная: этикетка и врач знают это лучше сканера.

### Что делать, если результата нет?

Покажите этикетку при ровном свете или введите штрих-код вручную, если поле есть. Если продукта нет в каталоге, прочитайте список сами. Пустой ответ тоже информация: этот флакон каталог не узнал.

## Открыть

[Сканер Hair Advisor](/ai-style/care/ingredient) работает с этикеткой, которая уже есть у вас. Читайте результат как одну часть решения, не как единственное доказательство.
""",
        "cover_image_path": SCAN_CARD,
        "cover_alt": "Карточка ухода MySaloon: пример сканера продукта на телефоне, не реальный результат анализа.",
        "cover_width": 1152,
        "cover_height": 864,
        "related_style_ids": ["men-textured-crop"],
        "related_slugs": ["virtual-soch-turmagini-sinab-korish", "textured-crop-soch-turmagi"],
        "related_morf_service": "scan",
        "conversion_cta_href": "/ai-style/care/ingredient",
        "conversion_cta_label": "Открыть сканер",
        "conversion_event": "scan_cta_click",
        "sources": cosmetic_sources("ru"),
    },
    {
        "slug": "shampun-tarkibini-tekshirish",
        "locale": "en",
        "category": "hair-advisor",
        "title": "How to read a shampoo ingredient list",
        "seo_title": "How to check a shampoo formula | Hair Advisor",
        "meta_description": "How to read the ingredient list on a shampoo. Hair Advisor explains names it can read. It does not diagnose your scalp.",
        "excerpt": "The first names on a label are usually the larger part of the formula. The scanner helps you read. It is not a doctor.",
        "content": """The back of a shampoo bottle is a long line of Latin names. You do not need to memorize it. The useful step is to understand the order of the list and compare it with what you actually feel: dryness, weight, itch. Hair Advisor in MySaloon helps with that reading. It does not diagnose a hair or scalp condition, and it does not promise that a shampoo will fix your hair.

The picture above is the care-card illustration from the app. It is not a real scan result, and the bottle in it is not a specific shampoo.

## How labels are ordered

Under the EU cosmetic regulation (EC 1223/2009, Article 19), ingredients are generally listed in descending order of weight at the time they are added. Ingredients at roughly under 1% may be listed in any order after that. So the first three or four names say more about the base, and the long tail is not automatically the “main effect.”

Official spellings live in the European Commission’s CosIng database. You look up an INCI name there. CosIng also does not tell you that a product suits you.

## What Hair Advisor does

The path that exists today:

1. Open the [ingredient scanner](/ai-style/care/ingredient). A short overview is on [this page](/morf-ai/ingredient-scanner).
2. Show a barcode or the label. The app returns a product it can match and the ingredient names it could read.
3. Familiar names get a short explanation. You can check an unclear line in CosIng yourself.

What we are not claiming:

- Not every label, in every language, is read completely on the first try. Glossy, tiny, or cropped text stays incomplete.
- A product missing from the catalog can come back as not found. That does not mean the shampoo is bad.
- The scanner is not an allergy test or a treatment plan. Itch, shedding, or broken skin needs a clinician.

Scanner abilities that have not been checked on a phone are not described here as working features.

## What to notice without a good/bad stamp

Sulfates, silicones, or the word “natural” are not a verdict by themselves. Some people feel a tight scalp after washing and try a milder cleansing base. Others want a stronger wash for oily roots. A label alone cannot settle that. How your hair feels matters too.

If you are also choosing a haircut, care does not answer the shape question. A short textured cut such as [Textured Crop](/guides/textured-crop-soch-turmagi) is often worn with a light, low-shine product. The shape itself is previewed in [try-on](/guides/virtual-soch-turmagini-sinab-korish).

## Questions

### Is a shampoo bad if water is the first ingredient?

No. Water is the base of most wash products. The names after it say more about the rest of the formula.

### Will the scanner predict an allergy?

No. It explains names. An allergy is personal. The label and a clinician know more than the scanner.

### What if nothing comes back?

Show the label in even light, or type the barcode if the field is there. If the catalog does not know the bottle, read the list yourself. An empty result is still information: this bottle was not matched.

## Open it

The [Hair Advisor scanner](/ai-style/care/ingredient) works with a label you already have. Treat the result as one part of a care decision, not the only evidence.
""",
        "cover_image_path": SCAN_CARD,
        "cover_alt": "MySaloon care card: a phone showing a product-scan illustration, not a real analysis result.",
        "cover_width": 1152,
        "cover_height": 864,
        "related_style_ids": ["men-textured-crop"],
        "related_slugs": ["virtual-soch-turmagini-sinab-korish", "textured-crop-soch-turmagi"],
        "related_morf_service": "scan",
        "conversion_cta_href": "/ai-style/care/ingredient",
        "conversion_cta_label": "Open the scanner",
        "conversion_event": "scan_cta_click",
        "sources": cosmetic_sources("en"),
    },
]
