"""Tarkib sahifasi uchun 20 ta demo / fake mahsulotlarni kiritish va o'chirish komandasi.

Ishlatish:
    python manage.py seed_care_demo_products          # 20 ta demo mahsulot qo'shish
    python manage.py seed_care_demo_products --purge  # Barcha demo mahsulotlarni bir zumda o'chirish
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from ai.models import CareProduct

DEMO_SLUG_PREFIX = "demo-"

DEMO_PRODUCTS = [
    # 1. Shampunlar
    {
        "slug": "demo-loreal-hyaluron-plump",
        "name": "Hyaluron Plump Namlantiruvchi Shampun",
        "brand": "L'Oréal Paris",
        "category": "shampoo",
        "ingredients_text": "Aqua, Sodium Laureth Sulfate, Glycol Distearate, Sodium Chloride, Cocamidopropyl Betaine, Dimethicone, Sodium Hyaluronate, Citric Acid, Sodium Benzoate, Parfum",
        "ingredients": ["Aqua", "Sodium Laureth Sulfate", "Sodium Hyaluronate", "Cocamidopropyl Betaine", "Dimethicone", "Citric Acid"],
        "usage_uz": "Nam sochlarga surting, ildizdan uchigacha yumshoq massaj qiling va 1-2 daqiqadan so'ng iliq suvda yuving.",
        "purpose_uz": "Quruq va suvsizlangan sochlarga 72 soatgacha namlik berish va og'irlashtirmasdan yengillik bag'ishlash.",
        "suitable_for": ["dry", "normal", "wavy", "straight"],
        "not_suitable_for": ["oily"],
        "pros_uz": "Sochlarga darhol yumshoqlik va jilo beradi, yoqimli iforga ega.",
        "cons_uz": "Sulfat mavjud, juda yog'li soch ildizlariga to'g'ri kelmasligi mumkin.",
        "warnings_uz": "Ko'zga tushganda darhol ko'p miqdordagi suv bilan yuving.",
        "sort_order": 1,
    },
    {
        "slug": "demo-kerastase-genesis-shampoo",
        "name": "Genesis Anti-Fall Kuchaytiruvchi Shampun",
        "brand": "Kérastase",
        "category": "shampoo",
        "ingredients_text": "Aqua, Sodium Laureth Sulfate, Citric Acid, Cocamidopropyl Betaine, Edelweiss Flower Extract, Ginger Root Extract, Salicylic Acid, Limonene, Parfum",
        "ingredients": ["Aqua", "Edelweiss Flower Extract", "Ginger Root Extract", "Salicylic Acid", "Citric Acid"],
        "usage_uz": "Kaftga ozgina olib, ho'l sochlarga surting. Bosh terisini 2 daqiqa massaj qilib, ko'pik hosil qiling va yuving.",
        "purpose_uz": "Soch tolalari sinishi natijasida to'kilishni kamaytirish va soch ildizlarini mustahkamlash.",
        "suitable_for": ["damaged", "normal", "oily", "straight", "wavy"],
        "not_suitable_for": [],
        "pros_uz": "Sochni mustahkamlaydi, ildizlarni ortiqcha yog'dan tozalaydi.",
        "cons_uz": "Premium narx toifasida.",
        "warnings_uz": "Faqat tashqi qo'llash uchun.",
        "sort_order": 2,
    },
    {
        "slug": "demo-dermaxpro-scalp-shampoo",
        "name": "DermaXPRO Bosh Terisi Balans Shampuni",
        "brand": "Head & Shoulders",
        "category": "shampoo",
        "ingredients_text": "Aqua, Sodium Laureth Sulfate, Piroctone Olamine, Cocamidopropyl Betaine, Aloe Barbadensis Leaf Juice, Tocopheryl Acetate, Niacinamide, Parfum",
        "ingredients": ["Aqua", "Piroctone Olamine", "Aloe Barbadensis Leaf Juice", "Niacinamide", "Tocopheryl Acetate"],
        "usage_uz": "Haftada 2-3 marta bosh terisiga surtib 2-3 daqiqa ushlang, so'ng yaxshilab chayib tashlang.",
        "purpose_uz": "Bosh terisi qazg'og'ini bartaraf etish va terining tabiiy mikrobiomini tiklash.",
        "suitable_for": ["oily", "damaged", "straight", "wavy", "curly"],
        "not_suitable_for": [],
        "pros_uz": "Pirokton olamin qazg'oq sababchisiga qarshi samarali kurashadi, qichishishni yo'qotadi.",
        "cons_uz": "Kundalik har kungi yuvish uchun biroz quritishi mumkin.",
        "warnings_uz": "Ko'zga tekkanda achishtirishi mumkin.",
        "sort_order": 3,
    },
    {
        "slug": "demo-olaplex-no4-shampoo",
        "name": "No.4 Bond Maintenance Tiklovchi Shampun",
        "brand": "Olaplex",
        "category": "shampoo",
        "ingredients_text": "Aqua, Sodium Lauroyl Methyl Isethionate, Bis-Aminopropyl Diglycol Dimaleate, Glycerin, Hydrolyzed Vegetable Protein, Argania Spinosa Kernel Oil, Parfum",
        "ingredients": ["Bis-Aminopropyl Diglycol Dimaleate", "Hydrolyzed Vegetable Protein", "Argania Spinosa Kernel Oil", "Glycerin"],
        "usage_uz": "Konsentrlangan formula sabab juda oz miqdorda oling, nam sochlarga surtib ko'pirtiring va yuving.",
        "purpose_uz": "Bo'yoq, ochtirish yoki issiqlikdan shikastlangan disulfid bog'lanishlarini molekulyar darajada qayta tiklash.",
        "suitable_for": ["damaged", "bleached", "colored", "curly", "wavy", "dry"],
        "not_suitable_for": [],
        "pros_uz": "Sulfatsiz, rangni yuvib ketmaydi, mo'rt sochlarni kuchli mustahkamlaydi.",
        "cons_uz": "Zich tekstura, ko'p miqdorda ishlatilsa sochni tez yog'lantirishi mumkin.",
        "warnings_uz": "Asl mahsulot ekanligiga ishonch hosil qiling.",
        "sort_order": 4,
    },
    {
        "slug": "demo-moroccanoil-clarifying-shampoo",
        "name": "Clarifying Chuqur Tozalovchi Shampun",
        "brand": "Moroccanoil",
        "category": "shampoo",
        "ingredients_text": "Aqua, Sodium Lauroyl Sarcosinate, Cocamidopropyl Hydroxysultaine, Argania Spinosa Kernel Oil, Lavandula Angustifolia Extract, Keratin, Tetrasodium EDTA",
        "ingredients": ["Argania Spinosa Kernel Oil", "Keratin", "Lavandula Angustifolia Extract", "Sodium Lauroyl Sarcosinate"],
        "usage_uz": "Haftada 1 marta yoki 2 haftada bir marta staling vositalari va minerallarni chuqur tozalash uchun ishlating.",
        "purpose_uz": "Xlor, qattiq suv tuzlari va lak/gel qoldiqlarini sochlarni quritmasdan yuvib tashlash.",
        "suitable_for": ["oily", "normal", "straight", "wavy"],
        "not_suitable_for": ["bleached", "dry"],
        "pros_uz": "Bosh terisiga erkin nafas beradi, sochlarni yengil va havodor qiladi.",
        "cons_uz": "Rang berilgan yoki oqartirilgan sochlarning pigmentini tez yuvishi mumkin.",
        "warnings_uz": "Har kuni ishlatmang.",
        "sort_order": 5,
    },

    # 2. Balzamlar va Konditsionerlar
    {
        "slug": "demo-absolut-repair-conditioner",
        "name": "Absolut Repair Proteinli Balzam",
        "brand": "L'Oréal Professionnel",
        "category": "balsam",
        "ingredients_text": "Aqua, Cetearyl Alcohol, Behentrimonium Chloride, Quinoa Seed Extract, Hydrolyzed Wheat Protein, Candelilla Cera, Lactic Acid, Isopropyl Alcohol",
        "ingredients": ["Quinoa Seed Extract", "Hydrolyzed Wheat Protein", "Lactic Acid", "Cetearyl Alcohol"],
        "usage_uz": "Shampundan keyin sochlarning ortiqcha suvini siqib, faqat o'rta qismi va uchlariga surting. 1-2 daqiqadan so'ng yuving.",
        "purpose_uz": "Zararlangan sochlarning po'stloq (kutikula) qavatini yopish va oson taralishini ta'minlash.",
        "suitable_for": ["damaged", "dry", "bleached", "colored", "wavy", "straight"],
        "not_suitable_for": ["oily"],
        "pros_uz": "Sochlarni ipakdek silliq qiladi, tarash paytida sinishdan asraydi.",
        "cons_uz": "Bosh terisiga tegsa ildizlarni tez kir qiladi.",
        "warnings_uz": "Bosh terisiga surtmang, faqat sochlarga qo'llang.",
        "sort_order": 6,
    },
    {
        "slug": "demo-fructis-sos-conditioner",
        "name": "Fructis SOS Recovery Tiklovchi Balzam",
        "brand": "Garnier",
        "category": "balsam",
        "ingredients_text": "Aqua, Cetearyl Alcohol, Dipalmitoylethyl Hydroxyethylmonium Methosulfate, Amla Fruit Extract, Keraphyll, Niacinamide, Saccharum Officinarum Extract",
        "ingredients": ["Amla Fruit Extract", "Keraphyll", "Niacinamide", "Cetearyl Alcohol"],
        "usage_uz": "Yuvilgan nam sochlarga 2 daqiqaga surtib qo'ying, so'ng yaxshilab yuving.",
        "purpose_uz": "Yorilgan soch uchlarini tiklash va 1 yillik shikastlanish asoratlarini bartaraf etish.",
        "suitable_for": ["dry", "damaged", "wavy", "curly"],
        "not_suitable_for": ["oily"],
        "pros_uz": "Qulay narx, ajoyib mevali hid va tezkor taraluvchanlik effekti.",
        "cons_uz": "Yengil sochlarni biroz og'irlashtirishi mumkin.",
        "warnings_uz": "Faqat soch tolasiga qo'llansin.",
        "sort_order": 7,
    },
    {
        "slug": "demo-tresemme-keratin-smooth-balsam",
        "name": "Keratin Smooth Silliqlovchi Balzam",
        "brand": "Tresemmé",
        "category": "balsam",
        "ingredients_text": "Aqua, Cetearyl Alcohol, Dimethicone, Sclerocarya Birrea Seed Oil (Marula Oil), Hydrolyzed Keratin, Stearamidopropyl Dimethylamine, Behentrimonium Chloride",
        "ingredients": ["Marula Oil", "Hydrolyzed Keratin", "Dimethicone", "Cetearyl Alcohol"],
        "usage_uz": "Soch o'rtasidan uchlarigacha bir tekis taqsimlang, 2-3 daqiqa kuting va iliq suvda yuving.",
        "purpose_uz": "Sochlarning to'zg'ishi (frizz)ni 72 soatgacha to'xtatish va silliq, yaltiroq ko'rinish berish.",
        "suitable_for": ["wavy", "curly", "damaged", "straight", "normal"],
        "not_suitable_for": [],
        "pros_uz": "Salondagidek tekis va silliq effekt beradi, fen bilan quritishni osonlashtiradi.",
        "cons_uz": "Tarkibida silikon mavjud.",
        "warnings_uz": "Ildizlarga surtish tavsiya etilmaydi.",
        "sort_order": 8,
    },
    {
        "slug": "demo-tigi-resurrection-conditioner",
        "name": "Bed Head Resurrection Tiklovchi Balzam",
        "brand": "TIGI",
        "category": "balsam",
        "ingredients_text": "Aqua, Cetearyl Alcohol, Dimethicone, Fragrance, Stearamidopropyl Dimethylamine, Amodimethicone, Lactic Acid, Dipropylene Glycol, Selaginella Lepidophylla Extract",
        "ingredients": ["Selaginella Lepidophylla Extract", "Amodimethicone", "Lactic Acid", "Cetearyl Alcohol"],
        "usage_uz": "Nam sochlarga mo'l miqdorda surting, 3-5 daqiqa ushlab turing va yuving.",
        "purpose_uz": "Kimyoviy ishlov berilgan, qattiq quruq va jonsiz sochlarni shoshilinch jonlantirish.",
        "suitable_for": ["damaged", "bleached", "dry", "curly"],
        "not_suitable_for": ["oily", "normal"],
        "pros_uz": "Juda kuchli ta'sir qiluvchi formula, yorqin ifor.",
        "cons_uz": "Yupqa va normal sochlarga og'irlik qilishi mumkin.",
        "warnings_uz": "Faqat shikastlangan sochlar uchun.",
        "sort_order": 9,
    },

    # 3. Maskalar
    {
        "slug": "demo-kerastase-nutritive-mask",
        "name": "Nutritive Masquintense Chuqur Oziqlantiruvchi Maska",
        "brand": "Kérastase",
        "category": "mask",
        "ingredients_text": "Aqua, Cetearyl Alcohol, Dimethicone, Glycerin, Iris Florentina Root Extract, Hydrolyzed Wheat Protein, Niacinamide, Behentrimonium Chloride, Parfum",
        "ingredients": ["Iris Florentina Root Extract", "Hydrolyzed Wheat Protein", "Niacinamide", "Glycerin"],
        "usage_uz": "Haftada 1-2 marta yuvilgan, sochiq bilan siqilgan sochlarga surting. 5-10 daqiqa ushlang va yaxshilab yuving.",
        "purpose_uz": "O'ta quruq soch tolalarini chuqur oziqlantirish, ularga elastiklik va hayotiylik baxsh etish.",
        "suitable_for": ["dry", "curly", "wavy", "damaged"],
        "not_suitable_for": ["oily"],
        "pros_uz": "Sochlarni ichki qatlamidan to'yintiradi, uzoq muddatli ta'sir.",
        "cons_uz": "Yuqori narx segmenti.",
        "warnings_uz": "Haftasiga 2 martadan ko'p ishlatmang.",
        "sort_order": 10,
    },
    {
        "slug": "demo-loreal-metal-detox-mask",
        "name": "Metal Detox Himoyalovchi Maska",
        "brand": "L'Oréal Professionnel",
        "category": "mask",
        "ingredients_text": "Aqua, Cetearyl Alcohol, Amodimethicone, Glicoamine, Aminopropyl Triethoxysilane, Trideceth-6, Cetrimonium Chloride, Citric Acid",
        "ingredients": ["Glicoamine", "Aminopropyl Triethoxysilane", "Citric Acid"],
        "usage_uz": "Bo'yashdan keyin yoki haftalik parvarishda 3-5 daqiqa davomida sochlarga singdiring va yuving.",
        "purpose_uz": "Suvdagi og'ir metall zarralarini neytrallash va sochlarning sinishini 87% ga kamaytirish.",
        "suitable_for": ["bleached", "colored", "damaged", "straight", "wavy", "curly"],
        "not_suitable_for": [],
        "pros_uz": "Soch rangining yorqinligini saqlaydi, xiralashishdan himoyalaydi.",
        "cons_uz": "Professional vosita, doimiy bo'lmagan sochlarga zarurati kamroq.",
        "warnings_uz": "Ko'z bilan aloqadan saqlaning.",
        "sort_order": 11,
    },
    {
        "slug": "demo-elizavecca-collagen-mask",
        "name": "CER-100 Collagen Maska",
        "brand": "Elizavecca",
        "category": "mask",
        "ingredients_text": "Aqua, Cetearyl Alcohol, Hydrolyzed Collagen, Hydrolyzed Keratin, Gelatin, Avena Sativa Protein Extract, Ceramide NP, Parfum",
        "ingredients": ["Hydrolyzed Collagen", "Hydrolyzed Keratin", "Ceramide NP", "Gelatin"],
        "usage_uz": "Toza, quruqroq sochlarga surting, 5-20 daqiqa ushlab turing (termo-qalpoq bilan yaxshiroq) va yuving.",
        "purpose_uz": "Kollagen va keramidi bilan sochlarni qalinlashtirish va laminar porlash berish.",
        "suitable_for": ["damaged", "dry", "bleached", "straight", "wavy"],
        "not_suitable_for": ["oily"],
        "pros_uz": "Tezkor ko'zga ko'rinarli natija, laminatsiya effekti.",
        "cons_uz": "Hajmi kichik (100ml).",
        "warnings_uz": "Iliq suvda chayilsin.",
        "sort_order": 12,
    },
    {
        "slug": "demo-sheamoisture-castor-oil-mask",
        "name": "Jamaican Black Castor Oil Tiklovchi Maska",
        "brand": "Shea Moisture",
        "category": "mask",
        "ingredients_text": "Aqua, Butyrospermum Parkii (Shea) Butter, Ricinus Communis (Castor) Seed Oil, Mentha Piperita Leaf Extract, Hydrolyzed Rice Protein, Apple Cider Vinegar",
        "ingredients": ["Shea Butter", "Castor Seed Oil", "Mentha Piperita Leaf Extract", "Apple Cider Vinegar"],
        "usage_uz": "Ildizdan uchgacha toza sochlarga surting. 10-15 daqiqadan so'ng yaxshilab chayib tashlang.",
        "purpose_uz": "Jingalak va to'lqinsimon sochlarni namlantirish, o'sishini rag'batlantirish va jingalak shaklini chiroyli saqlash.",
        "suitable_for": ["curly", "wavy", "dry", "damaged"],
        "not_suitable_for": ["straight", "oily"],
        "pros_uz": "To'liq tabiiy organik yog'lar va ekstraktlar, sulfat va parabenlarsiz.",
        "cons_uz": "Juda boy va og'ir tekstura, tekis sochlarni yopishtirib qo'yishi mumkin.",
        "warnings_uz": "Kichik miqdordan boshlang.",
        "sort_order": 13,
    },

    # 4. Yog'lar va Serumlarda
    {
        "slug": "demo-moroccanoil-treatment-oil",
        "name": "Original Argan Yog'i Parvarishi",
        "brand": "Moroccanoil",
        "category": "oil",
        "ingredients_text": "Cyclomethicone, Dimethicone, Argania Spinosa Kernel Oil, Linum Usitatissimum Seed Extract, Fragrance, CI 26100, CI 47000",
        "ingredients": ["Argania Spinosa Kernel Oil", "Linum Usitatissimum Seed Extract", "Dimethicone"],
        "usage_uz": "Nam yoki quruq sochlarga 1-2 tomchi tomizib, kaftlarda eritib, sochlarning o'rtasidan uchlariga surting.",
        "purpose_uz": "Sochlarni darhol mayin qilish, taralishni osonlashtirish va sog'lom jilo bag'ishlash.",
        "suitable_for": ["dry", "damaged", "normal", "wavy", "curly", "straight"],
        "not_suitable_for": ["oily"],
        "pros_uz": "Dunyo bo'yicha eng mashhur kult argan yog'i, tejamkor sarflanadi.",
        "cons_uz": "Ko'p surtilsa yog'li ko'rinish qoldirishi mumkin.",
        "warnings_uz": "Ildizlarga surtmang.",
        "sort_order": 14,
    },
    {
        "slug": "demo-olaplex-no7-bonding-oil",
        "name": "No.7 Bonding Termo-Himoya Yog'i",
        "brand": "Olaplex",
        "category": "oil",
        "ingredients_text": "Dimethicone, Isohexadecane, Bis-Aminopropyl Diglycol Dimaleate, Helianthus Annuus Seed Oil, Punica Granatum Seed Oil, Morinda Citrifolia Fruit Oil",
        "ingredients": ["Bis-Aminopropyl Diglycol Dimaleate", "Helianthus Annuus Seed Oil", "Punica Granatum Seed Oil"],
        "usage_uz": "Fen yoki dazmoldan oldin ho'l/quruq sochga bir necha tomchi surting.",
        "purpose_uz": "Sochni 232°C gacha bo'lgan issiqlikdan himoya qilish, porlashni 2 barobar oshirish va tolalarni tiklash.",
        "suitable_for": ["damaged", "bleached", "colored", "straight", "wavy", "curly", "dry"],
        "not_suitable_for": [],
        "pros_uz": "O'ta yengil yog' — og'irlashtirmaydi, ultrabinafsha va issiqlikdan kuchli himoya.",
        "cons_uz": "Flakon hajmi 30ml.",
        "warnings_uz": "Ko'zga sachramasligiga e'tibor bering.",
        "sort_order": 15,
    },
    {
        "slug": "demo-the-ordinary-hair-density-serum",
        "name": "Multi-Peptide Zichlashtiruvchi Bosh Terisi Serumi",
        "brand": "The Ordinary",
        "category": "oil",
        "ingredients_text": "Aqua, Propanediol, Butylene Glycol, Glycerin, Caffeine, Biotinoyl Tripeptide-1, Larix Europaea Wood Extract, Camellia Sinensis Leaf Extract",
        "ingredients": ["Caffeine", "Biotinoyl Tripeptide-1", "Camellia Sinensis Leaf Extract", "Larix Europaea Wood Extract"],
        "usage_uz": "Kechqurun uxlashdan oldin quruq bosh terisiga bir necha tomchi tomizib, massaj qiling. Yuvib tashlanmaydi.",
        "purpose_uz": "Bosh terisi qon aylanishini yaxshilash, soch follikulalarini uyg'otish va qalinroq sochlar o'sishini qo'llab-quvvatlash.",
        "suitable_for": ["oily", "normal", "dry", "damaged", "straight", "wavy", "curly"],
        "not_suitable_for": [],
        "pros_uz": "Suv asosli — bosh terisini yog'lantirmaydi, peptidlar bilan to'yingan.",
        "cons_uz": "Natijasi 2-3 oylik muntazam foydalanishdan keyin seziladi.",
        "warnings_uz": "Ochiq yara yoki qattiq shikastlangan teriga surtmang.",
        "sort_order": 16,
    },

    # 5. Spreylar va Leave-in Vositalar
    {
        "slug": "demo-color-wow-dream-coat-spray",
        "name": "Dream Coat Supernatural Silliqlovchi Sprey",
        "brand": "Color WOW",
        "category": "spray",
        "ingredients_text": "Aqua, Dipropylene Glycol, Polysilicone-29, DMDM Hydantoin, Propylene Glycol, Glycerin, Chamomilla Recutita Flower Extract",
        "ingredients": ["Polysilicone-29", "Chamomilla Recutita Flower Extract", "Glycerin"],
        "usage_uz": "Yuvilgan nam sochni qismlarga bo'lib, mo'l seping. Cho'tka va fen bilan tortib quritish shart (issiqlik bilan faollashadi).",
        "purpose_uz": "Sochlarni nam havo va yomg'irda to'zg'ishdan saqlovchi ko'rinmas suv o'tkazmaydigan qoplama yaratish.",
        "suitable_for": ["wavy", "curly", "frizzy", "straight", "colored", "dry"],
        "not_suitable_for": [],
        "pros_uz": "Shishadek (glass hair) yaltiroq effekt, ta'siri 3-4 marta yuvishgacha saqlanadi.",
        "cons_uz": "Issiq fensiz ishlamaydi.",
        "warnings_uz": "Boshqa og'ir kremlar bilan aralashtirmang.",
        "sort_order": 17,
    },
    {
        "slug": "demo-got2b-guardian-angel-spray",
        "name": "Guardian Angel 220°C Issiqlik Spreyi",
        "brand": "Schwarzkopf got2b",
        "category": "spray",
        "ingredients_text": "Aqua, Alcohol Denat., VP/VA Copolymer, Laurdimonium Hydroxypropyl Hydrolyzed Wheat Protein, Cetrimonium Chloride, Sodium Benzoate, Parfum",
        "ingredients": ["Hydrolyzed Wheat Protein", "VP/VA Copolymer", "Cetrimonium Chloride"],
        "usage_uz": "Fen yoki dazmoldan oldin quruq yoki nam sochlarga 20-25 sm masofadan seping.",
        "purpose_uz": "Dazmol, ployka va fanning 220°C gacha issiqligidan sochni kuymaslikdan himoyalash.",
        "suitable_for": ["straight", "wavy", "curly", "damaged", "normal"],
        "not_suitable_for": [],
        "pros_uz": "Yengil fiksatsiya, hamyonbop narx va ishonchli termo-himoya.",
        "cons_uz": "Spirt (alcohol) mavjud.",
        "warnings_uz": "Ko'zga sepmang, ochiq olovdan uzoqda saqlang.",
        "sort_order": 18,
    },
    {
        "slug": "demo-ouai-wave-spray",
        "name": "Wave Spray Teksturali To'lqin Spreyi",
        "brand": "OUAI",
        "category": "spray",
        "ingredients_text": "Aqua, PPG-5-Ceteth-20, Isobutylene/Ethylmaleimide/Hydroxyethylmaleimide Copolymer, Polysorbate 20, Rice Protein, Cocos Nucifera Water",
        "ingredients": ["Rice Protein", "Cocos Nucifera Water", "Glycerin"],
        "usage_uz": "Nam sochlarga seping va qo'l bilan siqib to'lqin hosil qiling, tabiiy quritishga qoldiring yoki diffuzer ishlating.",
        "purpose_uz": "Dengiz sohilidagi tabiiy to'lqinsimon va yengil teksturali bejirim jingalaklar yaratish.",
        "suitable_for": ["wavy", "curly", "normal", "fine"],
        "not_suitable_for": ["straight"],
        "pros_uz": "Tuzli sprey emas — sochlarni quritmaydi, guruch oqsili va kokos suvi bilan oziqlantiradi.",
        "cons_uz": "Qattiq tekis sochlarga kuchsizlik qilishi mumkin.",
        "warnings_uz": "Ishlatishdan oldin silkitib oling.",
        "sort_order": 19,
    },
    {
        "slug": "demo-revlon-uniq-one-spray",
        "name": "UniqOne All In One 10-in-1 Soch Sprey-Niqobi",
        "brand": "Revlon Professional",
        "category": "spray",
        "ingredients_text": "Aqua, Cetearyl Alcohol, Behentrimonium Chloride, Panthenol, Silk Amino Acids, Ethylhexyl Methoxycinnamate, Butyl Methoxydibenzoylmethane",
        "ingredients": ["Panthenol", "Silk Amino Acids", "UV Filters", "Cetearyl Alcohol"],
        "usage_uz": "Nam sochga 10-15 sm masofadan 4-8 marta seping va tarang. Yuvilmaydi.",
        "purpose_uz": "Bitta mahsulotda 10 ta foyda: tiklash, jilo, termo-himoya, ipaklik, rang himoyasi, oson tarash, hajm, yorilgan uchlarni oldini olish.",
        "suitable_for": ["dry", "damaged", "colored", "wavy", "straight", "curly", "normal"],
        "not_suitable_for": ["oily"],
        "pros_uz": "Universal leave-in vosita, butun dunyoda eng ko'p sotilgan sprey.",
        "cons_uz": "Krem-teksturasi sabab juda ko'p sepilsa sochni og'irlashtirishi mumkin.",
        "warnings_uz": "Faqat sochlarning o'rtasi va uchlariga seping.",
        "sort_order": 20,
    },
]


class Command(BaseCommand):
    help = "Tarkib uchun 20 ta demo mahsulot kiritish yoki --purge orqali barchasini o'chirish"

    def add_arguments(self, parser):
        parser.add_argument(
            "--purge",
            action="store_true",
            help="Barcha demo (fake) mahsulotlarni bir zumda o'chiradi",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["purge"]:
            deleted_count, _ = CareProduct.objects.filter(slug__startswith=DEMO_SLUG_PREFIX).delete()
            self.stdout.write(
                self.style.SUCCESS(f"Barcha demo mahsulotlar o'chirildi! ({deleted_count} ta o'chirildi)")
            )
            return

        created_count = 0
        updated_count = 0
        for item in DEMO_PRODUCTS:
            slug = item["slug"]
            defaults = {
                "name": item["name"],
                "brand": item["brand"],
                "category": item["category"],
                "ingredients_text": item["ingredients_text"],
                "ingredients": item["ingredients"],
                "usage_uz": item["usage_uz"],
                "purpose_uz": item["purpose_uz"],
                "suitable_for": item["suitable_for"],
                "not_suitable_for": item["not_suitable_for"],
                "pros_uz": item["pros_uz"],
                "cons_uz": item["cons_uz"],
                "warnings_uz": item["warnings_uz"],
                "is_published": True,
                "sort_order": item["sort_order"],
            }
            obj, created = CareProduct.objects.update_or_create(
                slug=slug,
                defaults=defaults,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Tarkib demo mahsulotlari muvaffaqiyatli tayyorlandi! "
                f"(Yangi yaratildi: {created_count}, Yangilandi: {updated_count}, Jami: {len(DEMO_PRODUCTS)})"
            )
        )
