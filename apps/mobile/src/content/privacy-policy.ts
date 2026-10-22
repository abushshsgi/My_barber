export type PrivacySection = {
  title: string;
  body?: string;
  bullets?: string[];
  link?: string;
};

export type PrivacyPolicyDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: PrivacySection[];
  contactEmail: string;
  externalLink?: string;
};

const CONTACT_EMAIL = "help@mysaloon.uz";
const EXTERNAL_LINK = "https://doc-hosting.flycricket.io/mysaloon-terms-of-use/0135a7ee-d374-4758-b045-0f861aa55d4b/terms";

const EN: PrivacyPolicyDoc = {
  title: "Privacy Policy",
  updated: "This privacy policy is effective as of 2026-10-22",
  intro:
    "This privacy policy applies to the Mysaloon app for mobile devices and web browsers, together with any related services operated by Abdurahim Oripov (collectively, the \"Application\"). Abdurahim Oripov is hereby referred to as the \"Service Provider\".",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "Information Collection and Use",
      body: "The Application collects information when you download and use it. This information may include information such as",
      bullets: [
        "Your device's Internet Protocol address",
        "The pages of the Application that you visit, the time and date of your visit, the time spent on those pages",
        "The time spent on the Application",
        "your operating system you use",
      ],
    },
    {
      title: "Cookies and tracking technologies",
      body: "The Application or its third-party SDKs may use cookies, SDKs, pixels, and similar technologies to support functionality, analytics, or service delivery. Where required by applicable law, the Service Provider will obtain consent before using non-essential tracking technologies.",
    },
    {
      title: "Location Information",
      body: "The Application collects your device's location to provide location-based features, improve the Application, and support related services.",
      bullets: [
        "Geolocation Services: The Service Provider may use location data to provide location-based features or content.",
        "Analytics and Improvements: Aggregated location data may help the Service Provider understand usage patterns and improve performance.",
        "Third-Party Services: Location data may be shared with third-party services used to support Application functionality, subject to this privacy policy and applicable law.",
      ],
    },
    {
      title: "Your Rights",
      body: "You may request access to, correction of, or deletion of your personal data held by the Service Provider. To exercise these rights, or to withdraw consent where processing is based on consent, contact the Service Provider at help@mysaloon.uz.",
    },
    {
      title: "Your California privacy rights (CCPA/CPRA)",
      body: "If you are a California resident, you have the right to know what personal information is collected, the right to delete personal information, the right to opt out of the sale or sharing of personal information, and the right to non-discrimination for exercising these rights. To exercise your CCPA/CPRA rights, contact the Service Provider at help@mysaloon.uz.",
    },
    {
      title: "Artificial Intelligence",
      body: "The Application uses Artificial Intelligence (AI) technologies to enhance user experience and provide certain features. The AI components may process user data to deliver personalized content, recommendations, or automated functionalities. All AI processing is performed in accordance with this privacy policy and applicable laws. If you have questions about the AI features or data processing, please contact the Service Provider.",
    },
    {
      title: "Marketing Communications",
      body: "The Service Provider may use the information you provide to send important information, required notices, and, where permitted by law, marketing communications.",
    },
    {
      title: "Required Information",
      body: "For a better experience while using the Application, the Service Provider may require you to provide certain personally identifiable information, including but not limited to Name, Phone number, Email address, AI interaction data. The information the Service Provider requests will be retained and used as described in this privacy policy.",
    },
    {
      title: "Third Party Access",
      body: "Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application and their service. The Service Provider may share your information with third parties in the ways that are described in this privacy statement.",
    },
    {
      title: "International Data Transfers",
      body: "The Service Provider or its third-party service providers may transfer personal data to countries outside your country of residence, including outside the European Economic Area (EEA). Where applicable law requires safeguards for international transfers, the Service Provider will use appropriate mechanisms.",
      bullets: [
        "Standard Contractual Clauses (SCCs) approved by the European Commission",
        "Adequacy decisions or other legally recognized transfer mechanisms",
        "Your consent, where required and legally permitted",
      ],
    },
    {
      title: "Third Party Privacy Policies",
      body: "Please note that the Application utilizes third-party services that have their own Privacy Policy about handling data. Below are the links to the Privacy Policy of the third-party service providers used by the Application:",
      bullets: [
        "[Google Play Services](https://www.google.com/policies/privacy/)",
        "[Google Analytics for Firebase](https://firebase.google.com/support/privacy)",
      ],
    },
    {
      title: "Disclosure",
      body: "The Service Provider may disclose User Provided and Automatically Collected Information:",
      bullets: [
        "as required by law, such as to comply with a subpoena, or similar legal process",
        "when they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request",
        "with their trusted services providers who work on their behalf, do not have an independent use of the information the Service Provider discloses to them, and have agreed to adhere to the rules set forth in this privacy statement",
      ],
    },
    {
      title: "Opt-Out Rights",
      body: "You can stop further collection of information from your mobile device or computer by uninstalling the Application. Uninstalling will stop the Application from collecting data from your device, but it does not automatically delete information that has already been transmitted to the Service Provider or to third parties.",
      bullets: [
        "You can stop further collection of information from your device by ceasing to use the website. Ceasing to use will stop the website from collecting data from your device, but it does not automatically delete information that has already been transmitted to the Service Provider or to third parties.",
        "To request deletion of your personal data, to withdraw consent, or to exercise any of your rights, contact the Service Provider at help@mysaloon.uz.",
      ],
    },
    {
      title: "Data Retention Policy",
      body: "The Service Provider retains personal data based on its necessity for the stated purposes:",
      bullets: [
        "User Provided Data: Retained for the duration of your use of the Application plus 12 months thereafter, unless longer retention is required by law",
        "Automatically Collected Data: Retained for up to 24 months from collection, unless longer retention is required for legal compliance",
        "Aggregated and Anonymized Data: Retained indefinitely as it no longer identifies you",
        "Data required for legal compliance: Retained as long as required by applicable law",
      ],
    },
    {
      title: "Data Deletion",
      body: "You can request deletion of your personal data or account by contacting the Service Provider at help@mysaloon.uz. The Service Provider will process your request within the timeframes required by applicable law. Upon verification of your identity, the Service Provider will delete your personal data from its systems, except where retention is required for legal compliance or legitimate business purposes.",
    },
    {
      title: "Children",
      body: "The Application is not intended for children under 13 years of age, or such higher age as required by applicable law. The Service Provider does not knowingly solicit data from children or market the Application to them. Where parental or guardian consent is required under applicable law, the Application is not intended for use without that consent. The Service Provider does not knowingly collect personally identifiable information from children under 13 years of age in violation of applicable law. In the event the Service Provider discovers that a child has provided personal information, the Service Provider will immediately delete this from their servers. If you are a parent or guardian and you are aware that your child has provided the Service Provider with personal information, please contact the Service Provider (help@mysaloon.uz) so that they will be able to take the necessary actions.",
    },
    {
      title: "Security",
      body: "The Service Provider is concerned about safeguarding the confidentiality of your information. The Service Provider provides physical, electronic, and procedural safeguards to protect information the Service Provider processes and maintains.",
    },
    {
      title: "Data Breach Notification",
      body: "If a data breach occurs that affects your personal data, the Service Provider will notify you in accordance with applicable legal requirements, including, where required, providing information about the nature of the breach and the steps being taken to address it.",
    },
    {
      title: "Changes",
      body: "The Service Provider may update this Privacy Policy from time to time. The Service Provider will notify you of material changes by posting the updated Privacy Policy with an effective date. Where required by law, the Service Provider will seek your consent to material changes before they take effect. Previous versions of this Privacy Policy will be maintained and made available upon request by contacting the Service Provider at help@mysaloon.uz.",
    },
    {
      title: "Your Consent",
      body: "Where processing is based on consent, you provide that consent by affirmatively opting in to the relevant feature or action. You may withdraw consent at any time without affecting processing carried out before withdrawal. Processing based on other lawful bases is carried out as described above.",
    },
    {
      title: "Contact Us",
      body: "If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at help@mysaloon.uz.",
    },
    {
      title: "Privacy Policy Generator",
      body: "This privacy policy page was generated by [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/)",
    },
  ],
};

const UZ: PrivacyPolicyDoc = {
  title: "Maxfiylik siyosati",
  updated: "Ushbu maxfiylik siyosati 2026-10-22 yildan boshlab kuchga kiradi",
  intro:
    "Ushbu maxfiylik siyosati mobil qurilmalar va veb-brauzerlar uchun Mysaloon ilovasiga, shuningdek Abdurahim Oripov tomonidan boshqariladigan bog'liq xizmatlarga (umumiy holda, \"Ilova\") taalluqli. Abdurahim Oripov ushbu hujjatda \"Xizmat ko'rsatuvchi\" sifatida ataladi.",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "Ma'lumotlarni yig'ish va ishlatish",
      body: "Ilova yuklab o'ganda va ishlatganda ma'lumotlarni yig'adi. Bu ma'lumotlar quyidagilarni o'z ichiga oladi:",
      bullets: [
        "Qurilmaning Internet Protokol (IP) manzili",
        "Ilovaga tashrif buyurgan sahifalar, tashrif vaqti va sanasi, sahifalarda o'tkazilgan vaqt",
        "Ilovada o'tkazilgan vaqt",
        "Foydalanilayotgan operatsion tizim",
      ],
    },
    {
      title: "Kukilar va kuzatuv texnologiyalari",
      body: "Ilova yoki uning uchinchi tomon SDK lari funksionallikni qo'llab-quvvatlash, tahlil qilish yoki xizmat yetkazib berish uchun kukilar, SDKlar, piksellar va o'xshash texnologiyalardan foydalanishi mumkin. Qonun talab qilsa, Xizmat ko'rsatuvchi zarur bo'lmagan kuzatuv texnologiyalaridan foydalanishdan oldin rozilik oladi.",
    },
    {
      title: "Joylashuv ma'lumotlari",
      body: "Ilova joylashuvga asoslangan funksiyalarni taqdim etish, Ilovani yaxshilash va bog'liq xizmatlarni qo'llab-quvvatlash uchun qurilmaning joylashuvini yig'adi.",
      bullets: [
        "Geolokatsiya xizmatlari: Xizmat ko'rsatuvchi joylashuvga asoslangan funksiyalar yoki kontentni taqdim etish uchun joylashuv ma'lumotlaridan foydalanishi mumkin.",
        "Tahlil va yaxshilash: Jamlangan joylashuv ma'lumotlari Xizmat ko'rsatuvchidan foydalanish namunalarini tushunishiga va ishlashini yaxshilashiga yordam berishi mumkin.",
        "Uchinchi tomon xizmatlari: Joylashuv ma'lumotlari Ilova funksionalligini qo'llab-quvvatlash uchun ishlatiladigan uchinchi tomon xizmatlari bilan bu maxfiylik siyosati va qo'llanadigan qonunga muvofiq bo'lish sharti bilan baham ko'rinishi mumkin.",
      ],
    },
    {
      title: "Sizning huquqlaringiz",
      body: "Siz Xizmat ko'rsatuvchi tomonidan saqlanayotgan shaxsiy ma'lumotlaringizga kirishni, tuzatishni yoki o'chirishni so'rash huquqiga egasiz. Ushbu huquqlardan foydalanish yoki rozilikka asoslangan qayta ishlashdan rozilikni qaytarish uchun Xizmat ko'rsatuvchiga help@mysaloon.uz manzili orqali murojaat qiling.",
    },
    {
      title: "Kaliforniya maxfiylik huquqlari (CCPA/CPRA)",
      body: "Agar siz Kaliforniya aholisi bo'lsangiz, qaysi shaxsiy ma'lumotlar yig'ilayotganini bilish huquqi, shaxsiy ma'lumotlarni o'chirish huquqi, shaxsiy ma'lumotlarni sotish yoki baham ko'rishdan voz kechish huquqi va ushbu huquqlarni amalga oshirish uchun kamsitmaslik huquqiga egasiz. CCPA/CPRA huquqlaringizdan foydalanish uchun Xizmat ko'rsatuvchiga help@mysaloon.uz manzili orqali murojaat qiling.",
    },
    {
      title: "Sun'iy intellekt",
      body: "Ilova foydalanuvchi tajribasini yaxshilash va ma'lum funksiyalarni taqdim etish uchun Sun'iy Intellekt (AI) texnologiyalaridan foydalanadi. AI komponentlari shaxsiylashtirilgan kontent, tavsiyalar yoki avtomatlashtirilgan funksiyalarni yetkazib berish uchun foydalanuvchi ma'lumotlarini qayta ishlashi mumkin. Barcha AI qayta ishlashi ushbu maxfiylik siyosati va qo'llanadigan qonunga muvofiq amalga oshiriladi. AI funksiyalari yoki ma'lumotlarni qayta ishlash haqida savollaringiz bo'lsa, Xizmat ko'rsatuvchiga murojaat qiling.",
    },
    {
      title: "Marketing kommunikatsiyalari",
      body: "Xizmat ko'rsatuvchi muhim ma'lumotlarni, zaruriy bildirishnomalarni va qonun ruxsat bergan hollarda marketing kommunikatsiyalarini yuborish uchun berilgan ma'lumotlardan foydalanishi mumkin.",
    },
    {
      title: "Zarur ma'lumotlar",
      body: "Ilovadan foydalanishda yaxshiroq tajriba uchun Xizmat ko'rsatuvchi sizdan ma'lum shaxsiy ma'lumotlarni, jumladan ism, telefon raqami, elektron pochta manzili, AI o'zaro ta'sir ma'lumotlarini taqdim etishni talab qilishi mumkin. Xizmat ko'rsatuvchi so'ragan ma'lumotlar ushbu maxfiylik siyosatida tasvirlanganidek saqlanadi va ishlatiladi.",
    },
    {
      title: "Uchinchi tomon kirishi",
      body: "Faqat jamlangan va anonimlangan ma'lumotlar Xizmat ko'rsatuvchiga Ilovani va ularning xizmatini yaxshilashda yordam berish uchun tashqi xizmatlarga muntazam ravishda uzatiladi. Xizmat ko'rsatuvchi ushbu maxfiylik bayonnomasida tasvirlangan usullarda uchinchi tomonlar bilan ma'lumotlaringizni baham ko'rishi mumkin.",
    },
    {
      title: "Xalqaro ma'lumot uzatishlari",
      body: "Xizmat ko'rsatuvchi yoki uning uchinchi tomon xizmat ko'rsatuvchilari shaxsiy ma'lumotlarni yashash joyingizdan tashqari mamlakatlarga, jumladan Yevropa Iqtisodiy Hududi (EEA) dan tashqariga o'tkazishi mumkin. Xalqaro uzatishlar uchun qonun talab qilsa, Xizmat ko'rsatuvchi mos mexanizmlardan foydalanadi.",
      bullets: [
        "Yevropa Komissiyasi tomonidan tasdiqlangan Standart Shartnoma Bandlari (SCC)",
        "Tenglik qarorlari yoki boshqa qonuniy ravishda tan olingan uzatish mexanizmlari",
        "Talab qilinsa va qonuniy ravishda ruxsat etilsa, sizning roziligingiz",
      ],
    },
    {
      title: "Uchinchi tomon maxfiylik siyosatlari",
      body: "E'tibor bering, Ilova ma'lumotlarni qanday qilib qabul qiladigan o'z Maxfiylik siyosatiga ega uchinchi tomon xizmatlaridan foydalanadi. Ilova tomonidan ishlatiladigan uchinchi tomon xizmat ko'rsatuvchilarining Maxfiylik siyosati havolalari quyida:",
      bullets: [
        "[Google Play Services](https://www.google.com/policies/privacy/)",
        "[Google Analytics for Firebase](https://firebase.google.com/support/privacy)",
      ],
    },
    {
      title: "Oshkor qilish",
      body: "Xizmat ko'rsatuvchi Foydalanuvchi tomonidan taqdim etilgan va Avtomatik ravishda yig'ilgan ma'lumotlarni quyidagicha oshkor qilishi mumkin:",
      bullets: [
        "qonun talab qilganda, masalan, jinoiy ish bo'yicha buyruqqa yoki o'xshash jarayonga rioza qilish",
        "o'z huquqlarini himoya qilish, xavfsizligingizni yoki boshqalarning xavfsizligini himoya qilish, firibgarlikni tekshirish yoki hukumat talabiga javob berish zarur degan yaxshi niyatda ishonch bilan",
        "ularning nomidan ishlaydigan ishonchli xizmat ko'rsatuvchilari bilan, ular Xizmat ko'rsatuvchi oshkor qilgan ma'lumotlardan mustaqil foydalanmaydi va ushbu maxfiylik bayonnomasida belgilangan qoidalarga rioya qilishga rozi bo'lganlar bilan",
      ],
    },
    {
      title: "Rozilikdan voz kechish huquqlari",
      body: "Ilovani o'chirib tashlash orqali mobil qurilmangiz yoki kompyuteringizdan ma'lumotlarni keyingi yig'ishini to'xtatishingiz mumkin. O'chirish Ilovani qurilmangizdan ma'lumot yig'ishini to'xtatadi, lekin allaqachon Xizmat ko'rsatuvchiga yoki uchinchi tomonlarga uzatilgan ma'lumotlarni avtomatik ravishda o'chirib tashlamaydi.",
      bullets: [
        "Veb-saytdan foydalanishni to'xtatib, qurilmangizdan ma'lumotlarni keyingi yig'ishini to'xtatishingiz mumkin. Foydalanishni to'xtatish veb-saytni qurilmangizdan ma'lumot yig'ishini to'xtatadi, lekin allaqachon Xizmat ko'rsatuvchiga yoki uchinchi tomonlarga uzatilgan ma'lumotlarni avtomatik ravishda o'chirib tashlamaydi.",
        "Shaxsiy ma'lumotlaringizni o'chirishni, rozilikni qaytarishni yoki huquqlaringizdan foydalanish uchun Xizmat ko'rsatuvchiga help@mysaloon.uz manzili orqali murojaat qiling.",
      ],
    },
    {
      title: "Ma'lumotlarni saqlash siyosati",
      body: "Xizmat ko'rsatuvchi shaxsiy ma'lumotlarni ko'rsatilgan maqsadlar uchun zarurligiga asoslanib saqlaydi:",
      bullets: [
        "Foydalanuvchi tomonidan taqdim etilgan ma'lumotlar: Ilovadan foydalanishingiz davomi va undan keyin 12 oy davomida, qonun talab qilsa ko'proq vaqt davomida saqlanadi",
        "Avtomatik ravishda yig'ilgan ma'lumotlar: Yig'ilish sanasidan boshlab 24 oy davomida, qonunga rioza qilish uchun ko'proq vaqt talab qilinsa, saqlanadi",
        "Jamlangan va anonimlangan ma'lumotlar: Sizni aniqlamagani uchun cheksiz saqlanadi",
        "Qonuniy moslik uchun zarur ma'lumotlar: Qo'llanadigan qonun talab qilguncha saqlanadi",
      ],
    },
    {
      title: "Ma'lumotlarni o'chirish",
      body: "Shaxsiy ma'lumotlaringizni yoki hisobingizni o'chirishni so'rash uchun Xizmat ko'rsatuvchiga help@mysaloon.uz manzili orqali murojaat qiling. Xizmat ko'rsatuvchi so'rovingizni qo'llanadigan qonun talab etgan muddat ichida qayta ishlaydi. Identifikangizni tasdiqlagandan so'ng, Xizmat ko'rsatuvchi shaxsiy ma'lumotlaringizni tizimlaridan o'chiradi, qonuniy moslik yoki qonuniy biznes maqsadlari uchun saqlash talab qilinsa bundan mustasno.",
    },
    {
      title: "Bolalar",
      body: "Ilova 13 yoshgacha bo'lgan bolalar yoki qo'llanadigan qonunga ko'ra yuqori yosh uchun mo'ljallanmagan. Xizmat ko'rsatuvchi bolalardan bilmasdan ma'lumot yig'adi yoki Ilovani ular uchun marketing qilmaydi. Qo'llanadigan qonunga ko'ra ota-ona yoki vasiy roziligi talab qilinsa, Ilova ushbu roziliksiz foydalanish uchun mo'ljallanmagan. Xizmat ko'rsatuvchi qonunga zid ravishda 13 yoshgacha bo'lgan bolalardan bilmasdan shaxsiy aniqlanadigan ma'lumotlarni yig'maydi. Agar Xizmat ko'rsatuvchi bolaning shaxsiy ma'lumotlarini berganini bilib qolsa, ularni darhol serverlaridan o'chiradi. Agar siz ota-ona yoki vasiy bo'lsangiz va farzandingiz Xizmat ko'rsatuvchiga shaxsiy ma'lumot berganini bilsangiz, Xizmat ko'rsatuvchiga (help@mysaloon.uz) murojaat qiling, shunda ular zaruriy chorakora ko'rishi mumkin.",
    },
    {
      title: "Xavfsizlik",
      body: "Xizmat ko'rsatuvchi ma'lumotlaringiz maxfiyligini himoya qilishda xavotirda. Xizmat ko'rsatuvchi Xizmat ko'rsatuvchi qayta ishlaydigan va saqlaydigan ma'lumotlarni himoya qilish uchun jismoniy, elektron va protsedural tashkilotchiliklarini taqdim etadi.",
    },
    {
      title: "Ma'lumot buzilishi haqida xabar",
      body: "Agar shaxsiy ma'lumotlaringizga ta'sir qiladigan ma'lumot buzilishi sodir bo'lsa, Xizmat ko'rsatuvchi qo'llanadigan qonuniy talablarga muvofiq, zarur bo'lganda buzilish tabiati va qabul qilinayotgan choralar haqida ma'lumot berish orqali sizga xabar beradi.",
    },
    {
      title: "O'zgarishlar",
      body: "Xizmat ko'rsatuvchi vaqti-vaqti bilan ushbu Maxfiylik siyosatini yangilashi mumkin. Xizmat ko'rsatuvchi yangilangan Maxfiylik siyosatini kuchga kirish sanasi bilan e'lon qilish orqali o'zgarishlar haqida sizga xabar beradi. Qonun talab qilsa, Xizmat ko'rsatuvchi o'zgarishlar kuchga kirishidan oldin moddiy o'zgarishlar uchun rozilik so'raydi. Maxfiylik siyosatining oldingi versiyalari saqlanadi va Xizmat ko'rsatuvchiga help@mysaloon.uz manzili orqali so'rov bo'yicha taqdim etiladi.",
    },
    {
      title: "Sizning roziligingiz",
      body: "Qayta ishlash rozilikka asoslangan bo'lsa, siz tegishli funksiya yoki harakatga rozilik bildirish orqali rozilik berasiz. Oldin amalga oshirilgan qayta ishlashga ta'sir qilmasdan istalgan vaqtda rozilikni qaytarishingiz mumkin. Boshqa qonuniy asoslar asosida qayta ishlash yuqorida tasvirlanganidek amalga oshiriladi.",
    },
    {
      title: "Biz bilan bog'lanish",
      body: "Ilovadan foydalanayotganda maxfiylik bo'yicha savollaringiz bo'lsa yoki amaliyotlar haqida savollaringiz bo'lsa, Xizmat ko'rsatuvchiga help@mysaloon.uz elektron pochta manzili orqali murojaat qiling.",
    },
    {
      title: "Maxfiylik siyosati generatori",
      body: "Ushbu maxfiylik siyosati sahifasi [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/) tomonidan yaratilgan.",
    },
  ],
};

const RU: PrivacyPolicyDoc = {
  title: "Политика конфиденциальности",
  updated: "Эта политика конфиденциальности вступает в силу с 2026-10-22",
  intro:
    "Эта политика конфиденциальности применяется к приложению Mysaloon для мобильных устройств и веб-браузеров, а также к любым связанным услугам, управляемым Абдурахимом Ориповым (совместно именуемым «Приложение»). Абдурахим Орипов именуется в этом документе как «Поставщик услуг».",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "Сбор и использование информации",
      body: "Приложение собирает информацию при загрузке и использовании. Эта информация может включать:",
      bullets: [
        "IP-адрес вашего устройства",
        "страницы Приложения, которые вы посещаете, время и дату посещения, время, проведенное на этих страницах",
        "время, проведенное в Приложении",
        "ваша операционная система",
      ],
    },
    {
      title: "Файлы cookie и технологии отслеживания",
      body: "Приложение или его сторонние SDK могут использовать файлы cookie, SDK, пиксели и аналогичные технологии для поддержки функциональности, аналитики или доставки услуг. Где это требуется применимым законом, Поставщик услуг получит согласие перед использованием не необходимых технологий отслеживания.",
    },
    {
      title: "Информация о местоположении",
      body: "Приложение собирает местоположение вашего устройства для предоставления функций на основе местоположения, улучшения Приложения и поддержки связанных услуг.",
      bullets: [
        "Геолокационные службы: Поставщик услуг может использовать данные о местоположении для предоставления функций или контента на основе местоположения.",
        "Аналитика и улучшения: Агрегированные данные о местоположении могут помочь Поставщику услуг понять паттерны использования и улучшить производительность.",
        "Сторонние сервисы: Данные о местоположении могут быть переданы сторонним сервисам, используемым для поддержки функциональности Приложения, в соответствии с этой политикой конфиденциальности и применимым законом.",
      ],
    },
    {
      title: "Ваши права",
      body: "Вы можете запросить доступ, исправление или удаление ваших персональных данных, хранящихся у Поставщика услуг. Чтобы воспользоваться этими правами или отозвать согласие, где обработка основана на согласии, свяжитесь с Поставщик услуг по адресу help@mysaloon.uz.",
    },
    {
      title: "Ваши права на конфиденциальность в Калифорнии (CCPA/CPRA)",
      body: "Если вы житель Калифорнии, вы имеете право знать, какая личная информация собирается, право на удаление личной информации, право отказаться от продажи или обмена личной информацией и право на недискриминацию за осуществление этих прав. Чтобы воспользоваться правами CCPA/CPRA, свяжитесь с Поставщик услуг по адресу help@mysaloon.uz.",
    },
    {
      title: "Искусственный интеллект",
      body: "Приложение использует технологии искусственного интеллекта (AI) для улучшения пользовательского опыта и предоставления определенных функций. Компоненты AI могут обрабатывать пользовательские данные для предоставления персонализированного контента, рекомендаций или автоматизированных функций. Вся обработка AI выполняется в соответствии с этой политикой конфиденциальности и применимым законодательством. Если у вас есть вопросы о функциях AI или обработке данных, свяжитесь с Поставщиком услуг.",
    },
    {
      title: "Маркетинговые коммуникации",
      body: "Поставщик услуг может использовать предоставленную вами информацию для отправки важной информации, необходимых уведомлений и, где это разрешено законом, маркетинговых коммуникаций.",
    },
    {
      title: "Требуемая информация",
      body: "Для лучшего опыта использования Приложения Поставщик услуг может потребовать от вас предоставления определенной персональной информации, включая, но не ограничиваясь: имя, номер телефона, адрес электронной почты, данные взаимодействия с AI. Запрошенная Поставщиком услуг информация будет храниться и использоваться, как описано в этой политике конфиденциальности.",
    },
    {
      title: "Доступ третьих сторон",
      body: "Только агрегированные и анонимизированные данные периодически передаются внешним сервисам для помощи Поставщику услуг в улучшении Приложения и их сервиса. Поставщик услуг может передавать вашу информацию третьим сторонам способами, описанными в этом заявлении о конфиденциальности.",
    },
    {
      title: "Международная передача данных",
      body: "Поставщик услуг или его сторонние поставщики услуг могут передавать персональные данные в страны за пределами вашей страны проживания, включая за пределами Европейской экономической зоны (ЕЭЗ). Где применимый закон требует гарантий для международных передач, Поставщик услуг будет использовать соответствующие механизмы.",
      bullets: [
        "Стандартные договорные положения (SCC), одобренные Европейской комиссией",
        "Решения о достаточности или другие юридически признанные механизмы передачи",
        "Ваше согласие, где это требуется и юридически разрешено",
      ],
    },
    {
      title: "Политики конфиденциальности третьих сторон",
      body: "Обратите внимание, что Приложение использует сторонние сервисы, которые имеют свою Политику конфиденциальности об обработке данных. Ниже приведены ссылки на Политику конфиденциальности сторонних поставщиков услуг, используемых Приложением:",
      bullets: [
        "[Google Play Services](https://www.google.com/policies/privacy/)",
        "[Google Analytics for Firebase](https://firebase.google.com/support/privacy)",
      ],
    },
    {
      title: "Раскрытие",
      body: "Поставщик услуг может раскрыть предоставленную пользователем и автоматически собранную информацию:",
      bullets: [
        "по требованию закона, например, для соблюдения повестки или аналогичного юридического процесса",
        "когда они добросовестно считают, что раскрытие необходимо для защиты их прав, защиты вашей безопасности или безопасности других, расследования мошенничества или ответа на запрос правительства",
        "с их доверенными поставщиками услуг, которые работают от их имени, не имеют независимого использования информации, раскрываемой Поставщиком услуг, и согласились соблюдать правила, изложенные в этом заявлении о конфиденциальности",
      ],
    },
    {
      title: "Права на отказ",
      body: "Вы можете остановить дальнейший сбор информации с вашего мобильного устройства или компьютера, удалив Приложение. Удаление остановит сбор данных Приложением с вашего устройства, но не приведет к автоматическому удалению информации, которая уже была передана Поставщику услуг или третьим сторонам.",
      bullets: [
        "Вы можете остановить дальнейший сбор информации с вашего устройства, прекратив использование веб-сайта. Прекращение использования остановит сбор данных веб-сайтом с вашего устройства, но не приведет к автоматическому удалению информации, которая уже была передана Поставщику услуг или третьим сторонам.",
        "Чтобы запросить удаление ваших персональных данных, отозвать согласие или воспользоваться любыми из ваших прав, свяжитесь с Поставщик услуг по адресу help@mysaloon.uz.",
      ],
    },
    {
      title: "Политика хранения данных",
      body: "Поставщик услуг хранит персональные данные на основе их необходимости для указанных целей:",
      bullets: [
        "Данные, предоставленные пользователем: хранятся в течение периода использования вами Приложения плюс 12 месяцев после этого, если более длительное хранение не требуется законом",
        "Автоматически собранные данные: хранятся до 24 месяцев с момента сбора, если более длительное хранение не требуется для юридического соответствия",
        "Агрегированные и анонимизированные данные: хранятся неопределенно, так как они больше не идентифицируют вас",
        "Данные, требуемые для юридического соответствия: хранятся столько, сколько требуется применимым законом",
      ],
    },
    {
      title: "Удаление данных",
      body: "Вы можете запросить удаление ваших персональных данных или учетной записи, связавшись с Поставщик услуг по адресу help@mysaloon.uz. Поставщик услуг обработает ваш запрос в сроки, требуемые применимым законом. После проверки вашей личности Поставщик услуг удалит ваши персональные данные из своих систем, за исключением случаев, когда хранение требуется для юридического соответствия или законных деловых целей.",
    },
    {
      title: "Дети",
      body: "Приложение не предназначено для детей в возрасте до 13 лет или более старшего возраста, если это требуется применимым законом. Поставщик услуг не осознанно собирает данные у детей или не рекламирует Приложение им. Где требуется согласие родителя или опекуна по применимому закону, Приложение не предназначено для использования без этого согласия. Поставщик услуг не осознанно собирает персональную информацию от детей в возрасте до 13 лет в нарушение применимого закона. В случае, если Поставщик услуг обнаружит, что ребенок предоставил личную информацию, Поставщик услуг немедленно удалит ее со своих серверов. Если вы родитель или опекун и знаете, что ваш ребенок предоставил Поставщику услуг личную информацию, пожалуйста, свяжитесь с Поставщик услуг (help@mysaloon.uz), чтобы они могли принять необходимые меры.",
    },
    {
      title: "Безопасность",
      body: "Поставщик услуг обеспокоен защитой конфиденциальности вашей информации. Поставщик услуг предоставляет физические, электронные и процедурные гарантии для защиты информации, которую Поставщик услуг обрабатывает и хранит.",
    },
    {
      title: "Уведомление об утечке данных",
      body: "Если произойдет утечка данных, затрагивающая ваши персональные данные, Поставщик услуг уведомит вас в соответствии с применимыми юридическими требованиями, включая, где требуется, предоставление информации о характере утечки и предпринимаемых шагах для ее устранения.",
    },
    {
      title: "Изменения",
      body: "Поставщик услуг может время от времени обновлять эту Политику конфиденциальности. Поставщик услуг уведомит вас о существенных изменениях, публикуя обновленную Политику конфиденциальности с датой вступления в силу. Где это требуется законом, Поставщик услуг будет искать ваше согласие на существенные изменения до их вступления в силу. Предыдущие версии этой Политики конфиденциальности будут поддерживаться и доступны по запросу, связавшись с Поставщик услуг по адресу help@mysaloon.uz.",
    },
    {
      title: "Ваше согласие",
      body: "Где обработка основана на согласии, вы предоставляете это согласие, явно согласившись на соответствующую функцию или действие. Вы можете отозвать согласие в любое время без влияния на обработку, выполненную до отзыва. Обработка на других законных основаниях выполняется, как описано выше.",
    },
    {
      title: "Свяжитесь с нами",
      body: "Если у вас есть вопросы относительно конфиденциальности при использовании Приложения или вопросы о практиках, пожалуйста, свяжитесь с Поставщик услуг по электронной почте help@mysaloon.uz.",
    },
    {
      title: "Генератор политики конфиденциальности",
      body: "Эта страница политики конфиденциальности была создана с помощью [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/)",
    },
  ],
};

export function getPrivacyPolicy(lang: string | undefined): PrivacyPolicyDoc {
  const code = (lang ?? "uz").toLowerCase();
  if (code.startsWith("en")) return EN;
  if (code.startsWith("ru")) return RU;
  return UZ;
}
