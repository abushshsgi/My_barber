export type PrivacySection = {
  title: string;
  body?: string;
  bullets?: string[];
};

export type PrivacyPolicyDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: PrivacySection[];
  contactEmail: string;
};

const CONTACT_EMAIL = "help@mysaloon.uz";

const EN: PrivacyPolicyDoc = {
  title: "Privacy Policy",
  updated: "This privacy policy is effective as of 2026-10-22",
  intro:
    'This privacy policy applies to the Mysaloon app for mobile devices and web browsers, together with any related services operated by Abdurahim Oripov (collectively, the "Application"). Abdurahim Oripov is hereby referred to as the "Service Provider".',
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "Information Collection and Use",
      body: "The Application collects information when you download and use it. This information may include information such as:",
      bullets: [
        "Your device's Internet Protocol address",
        "The pages of the Application that you visit, the time and date of your visit, the time spent on those pages",
        "The time spent on the Application",
        "Your operating system you use",
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
        "As required by law, such as to comply with a subpoena, or similar legal process",
        "When they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request",
        "With their trusted services providers who work on their behalf, do not have an independent use of the information the Service Provider discloses to them, and have agreed to adhere to the rules set forth in this privacy statement",
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
  ],
};

const UZ: PrivacyPolicyDoc = {
  title: "Maxfiylik siyosati",
  updated: "Ushbu maxfiylik siyosati 2026-10-22 dan kuchga kiradi",
  intro:
    'Ushbu maxfiylik siyosati mobil qurilmalar va veb-brauzerlar uchun Mysaloon ilovasiga, shuningdek, Abdurahim Oripov tomonidan boshqariladigan bogʻliq xizmatlarga (jamlangan holda "Ilova") tegishli. Abdurahim Oripov "Xizmat taʼminotchisi" sifatida qabul qilinadi.',
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "Maʼlumotlarni yigʻish va ishlatish",
      body: "Ilovani yuklab va foydalanganda maʼlumotlar yigʻiladi. Bu maʼlumotlar quyidagilarni oʻz ichiga olishi mumkin:",
      bullets: [
        "Qurilmaning Internet protokol (IP) manzili",
        "Ilovada tashrif buyurgan sahifalar, tashrif vaqti va sanasi, sahifalarda sarflangan vaqt",
        "Ilovada sarflangan vaqt",
        "Foydalanayotgan operatsion tizimingiz",
      ],
    },
    {
      title: "Kuki va kuzatuv texnologiyalari",
      body: "Ilova yoki uning uchinchi tomon SDKlari funksionallikni qoʻllab-quvvatlash, tahlil qilish yoki xizmatni yetkazib berish uchun kuki, SDK, piksel va oʻxshash texnologiyalardan foydalanishi mumkin. Qonunda talab qilingan hollarda, Xizmat taʼminotchisi muhim boʻlmagan kuzatuv texnologiyalaridan foydalanishdan oldin rozilik oladi.",
    },
    {
      title: "Manzil maʼlumotlari",
      body: "Ilova manzilga asoslangan funksiyalarni taqdim etish, Ilovani yaxshilash va bogʻliq xizmatlarni qoʻllab-quvvatlash uchun qurilmaning manzilini yigʻadi.",
      bullets: [
        "Geolokatsiya xizmatlari: Xizmat taʼminotchisi manzilga asoslangan funksiyalar yoki kontentni taqdim etish uchun manzil maʼlumotlaridan foydalanishi mumkin.",
        "Tahlil va yaxshilash: Agregatsiyalangan manzil maʼlumotlari Xizmat taʼminotchisiga foydalanish naqshlarini tushunish va ishlashni yaxshilashga yordam berishi mumkin.",
        "Uchinchi tomon xizmatlari: Manzil maʼlumotlari Ilova funksionalligini qoʻllab-quvvatlash uchun ishlatiladigan uchinchi tomon xizmatlari bilan ushbu maxfiylik siyosati va amaldagi qonunga muvofiq boʻlgan holda baham koʻrinishi mumkin.",
      ],
    },
    {
      title: "Huquqlaringiz",
      body: "Siz Xizmat taʼminotchisi tomonidan saqlanayotgan shaxsiy maʼlumotlaringizga kirish, tuzatish yoki oʻchirishni soʻrash huquqiga egasiz. Ushbu huquqlardan foydalanish yoki rozilikka asoslangan ishlov berishda rozilikni qaytarib olish uchun Xizmat taʼminotchisiga help@mysaloon.uz manzili orqali murojaat qiling.",
    },
    {
      title: "Kaliforniya maxfiylik huquqlari (CCPA/CPRA)",
      body: "Agar siz Kaliforniya rezidenti boʻlsangiz, qaysi shaxsiy maʼlumotlar yigʻilishini bilish huquqi, shaxsiy maʼlumotlarni oʻchirish huquqi, shaxsiy maʼlumotlarni sotish yoki baham koʻrishdan bosh tortish huquqi va huquqlarni amalga oshirish uchun kamsitilmaslik huquqiga egasiz. CCPA/CPRA huquqlaringizni amalga oshirish uchun Xizmat taʼminotchisiga help@mysaloon.uz manzili orqali murojaat qiling.",
    },
    {
      title: "Sunʼiy intellekt",
      body: "Ilova foydalanuvchi tajribasini yaxshilash va maʼlum funksiyalarni taqdim etish uchun Sunʼiy intellekt (AI) texnologiyalaridan foydalanadi. AI komponentlari shaxsiylashtirilgan kontent, tavsiyalar yoki avtomatlashtirilgan funksiyalarni yetkazib berish uchun foydalanuvchi maʼlumotlarini qayta ishlashi mumkin. Barcha AI ishlov berilishi ushbu maxfiylik siyosati va amaldagi qonunga muvofiq amalga oshiriladi. AI funksiyalari yoki maʼlumotlarni qayta ishlash boʻyicha savollaringiz boʻlsa, Xizmat taʼminotchisiga murojaat qiling.",
    },
    {
      title: "Marketing kommunikatsiyalari",
      body: "Xizmat taʼminotchisi muhim maʼlumotlar, talab etilgan xabarnomalar va qonunda ruxsat berilgan hollarda marketing kommunikatsiyalarini yuborish uchun siz bergan maʼlumotlardan foydalanishi mumkin.",
    },
    {
      title: "Talab etiladigan maʼlumotlar",
      body: "Ilovadan foydalanishda yaxshiroq tajriba uchun Xizmat taʼminotchisi sizdan maʼlum shaxsiy maʼlumotlarni, jumladan, ism, telefon raqami, elektron pochta manzili, AI oʻzaro taʼsir maʼlumotlarini taqdim etishni talab qilishi mumkin. Xizmat taʼminotchisi soʻragan maʼlumotlar ushbu maxfiylik siyosatida tasvirlanganidek saqlanadi va ishlatiladi.",
    },
    {
      title: "Uchinchi tomon kirishi",
      body: "Faqat agregatsiyalangan va anonimlashtirilgan maʼlumotlar Xizmat taʼminotchisiga Ilovani va ularning xizmatini yaxshilashga yordam berish uchun tashqi xizmatlarga muntazam ravishda uzatiladi. Xizmat taʼminotchisi maʼlumotlaringizni ushbu maxfiylik bayonnomasida tasvirlangan usullarda uchinchi shaxslar bilan baham koʻrishi mumkin.",
    },
    {
      title: "Xalqaro maʼlumotlarni uzatish",
      body: "Xizmat taʼminotchisi yoki uning uchinchi tomon xizmat taʼminotchilari shaxsiy maʼlumotlarni yashash mamlakatingizdan tashqari, shu jumladan Yevropa Iqtisodiy Hududi (EEA) tashqarisidagi mamlakatlarga uzatishi mumkin. Xalqaro uzatishlar uchun qonun tegishli himoya choralarini talab qilsa, Xizmat taʼminotchisi mos mexanizmlardan foydalanadi.",
      bullets: [
        "Yevropa Komissiyasi tomonidan tasdiqlangan Standart Shartnoma Tadbirlari (SCC)",
        "Adekvatlik qarorlari yoki boshqa qonuniy ravishda tan olingan uzatish mexanizmlari",
        "Talab qilingan va qonuniy ravishda ruxsat etilgan hollarda sizning rozilikingiz",
      ],
    },
    {
      title: "Uchinchi tomon maxfiylik siyosatlari",
      body: "Ilova maʼlumotlarni qayta ishlash boʻyicha oʻz Maxfiylik siyosatiga ega boʻlgan uchinchi tomon xizmatlaridan foydalanishini qayd eting. Ilova tomonidan ishlatiladigan uchinchi tomon xizmat taʼminotchilarining Maxfiylik siyosati havolalari quyida keltirilgan:",
      bullets: [
        "[Google Play Xizmatlari](https://www.google.com/policies/privacy/)",
        "[Google Analytics for Firebase](https://firebase.google.com/support/privacy)",
      ],
    },
    {
      title: "Oshkor qilish",
      body: "Xizmat taʼminotchisi Foydalanuvchi tomonidan taqdim etilgan va Avtomatik ravishda yigʻilgan maʼlumotlarni quyidagicha oshkor qilishi mumkin:",
      bullets: [
        "Qonun talab qilganda, masalan, juma sumkasi yoki oʻxshash huquqiy jarayonga rioya qilish uchun",
        "Oʻz huquqlarini himoya qilish, xavfsizligingizni yoki boshqalar xavfsizligini himoya qilish, firibgarlikni tekshirish yoki hukumat talabiga javob berish uchun oshkor qilish zarur deb ishonchlari qolsa",
        "Ular nomidan ishlaydigan, Xizmat taʼminotchisi oshkor qilgan maʼlumotlardan mustaqil foydalanish huquqiga ega boʻlmagan va ushbu maxfiylik bayonnomasida belgilangan qoidalarga rioya qilishga rozilik bergan ishonchli xizmat taʼminotchilari bilan",
      ],
    },
    {
      title: "Bosh tortish huquqlari",
      body: "Ilovani oʻchirib tashlash orqali mobil qurilma yoki kompyuteringizdan maʼlumotlarni qoʻshimcha yigʻilishini toʻxtatishingiz mumkin. Oʻchirish Ilovani qurilmangizdan maʼlumot yigʻishini toʻxtatadi, biroq u allaqachon Xizmat taʼminotchisiga yoki uchinchi shaxslarga uzatilgan maʼlumotlarni avtomatik ravishda oʻchirmaydi.",
      bullets: [
        "Veb-saytdan foydalanishni toʻxtatish orqali qurilmangizdan maʼlumotlarni qoʻshimcha yigʻilishini toʻxtatishingiz mumkin. Foydalanishni toʻxtatish veb-saytni qurilmangizdan maʼlumot yigʻishini toʻxtatadi, biroq u allaqachon Xizmat taʼminotchisiga yoki uchinchi shaxslarga uzatilgan maʼlumotlarni avtomatik ravishda oʻchirmaydi.",
        "Shaxsiy maʼlumotlaringizni oʻchirishni, rozilikni qaytarib olishni yoki huquqlaringizdan birortasini amalga oshirish uchun Xizmat taʼminotchisiga help@mysaloon.uz manzili orqali murojaat qiling.",
      ],
    },
    {
      title: "Maʼlumotlarni saqlash siyosati",
      body: "Xizmat taʼminotchisi shaxsiy maʼlumotlarni belgilangan maqsadlar uchun zarurligiga asosan saqlaydi:",
      bullets: [
        "Foydalanuvchi tomonidan taqdim etilgan maʼlumotlar: Ilovadan foydalanishingiz davomi va undan keyin 12 oy davomida, qonunda uzoqroq saqlash talab qilinmaguncha saqlanadi",
        "Avtomatik ravishda yigʻilgan maʼlumotlar: Yigʻilganidan boshlab 24 oyga qadar, qonuniy muvofiqlik uchun uzoqroq saqlash talab qilinmaguncha saqlanadi",
        "Agregatsiyalangan va anonimlashtirilgan maʼlumotlar: Sizni aniqlamaydiganligi sababli cheksiz saqlanadi",
        "Qonuniy muvofiqlik uchun talab etiladigan maʼlumotlar: Amaldagi qonun talab qiladigan darajada saqlanadi",
      ],
    },
    {
      title: "Maʼlumotlarni oʻchirish",
      body: "Shaxsiy maʼlumotlaringizni yoki hisobingizni oʻchirishni soʻrash uchun Xizmat taʼminotchisiga help@mysaloon.uz manzili orqali murojaat qiling. Xizmat taʼminotchisi soʻrovingizni amaldagi qonun talab etilgan muddat ichida qayta ishladi. Shaxsligingizni tasdiqlagandan soʻng, Xizmat taʼminotchisi qonuniy muvofiqlik yoki qonuniy biznes maqsadlari uchun saqlash talab etilmagan joylarda shaxsiy maʼlumotlaringizni tizimlaridan oʻchiradi.",
    },
    {
      title: "Bolalar",
      body: "Ilova 13 yoshgacha boʻlgan bolalar yoki amaldagi qonunda talab qilingan yuqori yosh uchun moʻljallanmagan. Xizmat taʼminotchisi bolalardan maʼlumot yigʻish yoki ilovani ularga sotishni qasddan qilmaydi. Amaldagi qonunda ota-ona yoki vasiy roziligi talab qilingan hollarda, ilova ushbu roziliksiz foydalanish uchun moʻljallanmagan. Xizmat taʼminotchisi amaldagi qonunga zid ravishda 13 yoshgacha boʻlgan bolalardan shaxsiy maʼlumotlarni qasddan yigʻmaydi. Xizmat taʼminotchisi bolaning shaxsiy maʼlumotlarini berganini bilib qolsa, ular darhol serverlaridan oʻchiradi. Agar siz ota-ona yoki vasiy boʻlsangiz va farzandingiz Xizmat taʼminotchisiga shaxsiy maʼlumot berganini bilsangiz, Xizmat taʼminotchisi (help@mysaloon.uz) bilan bogʻlaning, shunda ular zarorat choralarini koʻrishi mumkin.",
    },
    {
      title: "Xavfsizlik",
      body: "Xizmat taʼminotchisi maʼlumotlaringiz maxfiyligini himoya qilishiga qiziqish bildiradi. Xizmat taʼminotchisi Xizmat taʼminotchisi qayta ishlaydigan va saqlaydigan maʼlumotlarni himoya qilish uchun jismoniy, elektron va protsessual himoya choralarini taqdim etadi.",
    },
    {
      title: "Maʼlumotlar buzilishi haqida xabar",
      body: "Agar shaxsiy maʼlumotlaringizga taʼsir qiladigan maʼlumotlar buzilishi boʻlsa, Xizmat taʼminotchisi amaldagi qonuniy talablarga muvofiq, shu jumladan zarur boʻlganda buzilish tabiati va hal qilish uchun olinayotgan choralar haqida maʼlumot berish orqali sizga xabar beradi.",
    },
    {
      title: "Oʻzgarishlar",
      body: "Xizmat taʼminotchisi vaqti-vaqti bilan ushbu Maxfiylik siyosatini yangilashi mumkin. Xizmat taʼminotchisi yangilangan Maxfiylik siyosatini kuchga kirish sanasi bilan eʼlon qilish orqali moddiy oʻzgarishlar haqida xabar beradi. Qonunda talab qilingan hollarda, Xizmat taʼminotchisi moddiy oʻzgarishlar kuchga kirishdan oldin rozilik oladi. Ushbu Maxfiylik siyosatining oldingi versiyalari Xizmat taʼminotchisiga help@mysaloon.uz manzili orqali murojaat qilish orqali soʻrash boʻyicha saqlanadi va taqdim etiladi.",
    },
    {
      title: "Sizning rozilikingiz",
      body: "Rozilikka asoslangan ishlov berishda, siz tegishli funksiya yoki harakatga faol ravishda kirish orqali rozilik bildirasiz. Siz oldingi ishlov berishga taʼsir qilmasdan istalgan vaqtda rozilikni qaytarib olishingiz mumkin. Boshqa qonuniy asoslarga asoslangan ishlov berish yuqorida tasvirlanganidek amalga oshiriladi.",
    },
    {
      title: "Biz bilan bogʻlanish",
      body: "Ilovadan foydalanishda maxfiylik boʻyicha savollaringiz boʻlsa yoki amaliyotlar boʻyicha savollaringiz boʻlsa, Xizmat taʼminotchisiga help@mysaloon.uz elektron pochta manzili orqali murojaat qiling.",
    },
  ],
};

const RU: PrivacyPolicyDoc = {
  title: "Политика конфиденциальности",
  updated: "Эта политика конфиденциальности вступает в силу с 2026-10-22",
  intro:
    "Эта политика конфиденциальности применяется к приложению Mysaloon для мобильных устройств и веб-браузеров, а также к связанным с ним услугам, управляемым Абдурахимом Ориповым (совместно именуемым «Приложение»). Абдурахим Орипов далее именуется «Поставщик услуг».",
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "Сбор и использование информации",
      body: "Приложение собирает информацию при загрузке и использовании. Эта информация может включать:",
      bullets: [
        "IP-адрес вашего устройства",
        "Страницы Приложения, которые вы посещаете, время и дата посещения, время, проведенное на этих страницах",
        "Время, проведенное в Приложении",
        "Используемая вами операционная система",
      ],
    },
    {
      title: "Файлы cookie и технологии отслеживания",
      body: "Приложение или его сторонние SDK могут использовать файлы cookie, SDK, пиксели и аналогичные технологии для поддержки функциональности, аналитики или предоставления услуг. Там, где это требуется применимым законом, Поставщик услуг получит согласие перед использованием несущественных технологий отслеживания.",
    },
    {
      title: "Информация о местоположении",
      body: "Приложение собирает местоположение вашего устройства для предоставления функций на основе местоположения, улучшения Приложения и поддержки связанных услуг.",
      bullets: [
        "Геолокационные услуги: Поставщик услуг может использовать данные о местоположении для предоставления функций или контента на основе местоположения.",
        "Аналитика и улучшения: Агрегированные данные о местоположении могут помочь Поставщику услуг понять модели использования и улучшить производительность.",
        "Сторонние сервисы: Данные о местоположении могут быть переданы сторонним сервисам, используемым для поддержки функциональности Приложения, в соответствии с этой политикой конфиденциальности и применимым законом.",
      ],
    },
    {
      title: "Ваши права",
      body: "Вы можете запросить доступ, исправление или удаление ваших персональных данных, хранящихся у Поставщика услуг. Для осуществления этих прав или отзыва согласия, где обработка основана на согласии, свяжитесь с Поставщик услуг по адресу help@mysaloon.uz.",
    },
    {
      title: "Ваши права на конфиденциальность в Калифорнии (CCPA/CPRA)",
      body: "Если вы являетесь резидентом Калифорнии, вы имеете право знать, какая личная информация собирается, право на удаление личной информации, право отказаться от продажи или обмена личной информацией и право на недискриминацию за осуществление этих прав. Для осуществления ваших прав по CCPA/CPRA свяжитесь с Поставщик услуг по адресу help@mysaloon.uz.",
    },
    {
      title: "Искусственный интеллект",
      body: "Приложение использует технологии искусственного интеллекта (AI) для улучшения пользовательского опыта и предоставления определённых функций. Компоненты AI могут обрабатывать пользовательские данные для предоставления персонализированного контента, рекомендаций или автоматизированных функций. Вся обработка AI выполняется в соответствии с этой политикой конфиденциальности и применимыми законами. Если у вас есть вопросы о функциях AI или обработке данных, свяжитесь с Поставщик услуг.",
    },
    {
      title: "Маркетинговые коммуникации",
      body: "Поставщик услуг может использовать предоставленную вами информацию для отправки важной информации, обязательных уведомлений и, где это разрешено законом, маркетинговых коммуникаций.",
    },
    {
      title: "Требуемая информация",
      body: "Для лучшего опыта использования Приложения Поставщик услуг может потребовать от вас предоставления определённой личной информации, включая, но не ограничиваясь: имя, номер телефона, адрес электронной почты, данные о взаимодействии с AI. Запрашиваемая Поставщиком услуг информация будет храниться и использоваться, как описано в этой политике конфиденциальности.",
    },
    {
      title: "Доступ третьих сторон",
      body: "Только агрегированные и анонимизированные данные периодически передаются внешним сервисам для помощи Поставщику услуг в улучшении Приложения и их услуг. Поставщик услуг может передавать вашу информацию третьим лицам способами, описанными в этом заявлении о конфиденциальности.",
    },
    {
      title: "Международная передача данных",
      body: "Поставщик услуг или его сторонние поставщики услуг могут передавать персональные данные в страны за пределами вашей страны проживания, включая за пределами Европейской экономической зоны (ЕЭЗ). Там, где применимый закон требует мер защиты для международных передач, Поставщик услуг будет использовать соответствующие механизмы.",
      bullets: [
        "Стандартные договорные положения (SCC), утверждённые Европейской комиссией",
        "Решения об адекватности или другие юридически признанные механизмы передачи",
        "Ваше согласие, где это требуется и юридически разрешено",
      ],
    },
    {
      title: "Политики конфиденциальности третьих сторон",
      body: "Обратите внимание, что Приложение использует сторонние сервисы, которые имеют собственную Политику конфиденциальности по обработке данных. Ниже приведены ссылки на Политику конфиденциальности сторонних поставщиков услуг, используемых Приложением:",
      bullets: [
        "[Google Play Services](https://www.google.com/policies/privacy/)",
        "[Google Analytics for Firebase](https://firebase.google.com/support/privacy)",
      ],
    },
    {
      title: "Раскрытие информации",
      body: "Поставщик услуг может раскрыть Предоставленную пользователем и автоматически собранную информацию:",
      bullets: [
        "По требованию закона, например, для соблюдения повестки или аналогичного юридического процесса",
        "Когда они добросовестно считают, что раскрытие необходимо для защиты их прав, защиты вашей безопасности или безопасности других, расследования мошенничества или ответа на запрос правительства",
        "С их доверенными поставщиками услуг, которые работают от их имени, не имеют независимого использования информации, которую Поставщик услуг им раскрывает, и согласились соблюдать правила, изложенные в этом заявлении о конфиденциальности",
      ],
    },
    {
      title: "Права на отказ",
      body: "Вы можете прекратить дальнейший сбор информации с вашего мобильного устройства или компьютера, удалив Приложение. Удаление остановит сбор данных Приложением с вашего устройства, но это не приведёт к автоматическому удалению информации, уже переданной Поставщику услуг или третьим лицам.",
      bullets: [
        "Вы можете прекратить дальнейший сбор информации с вашего устройства, прекратив использование веб-сайта. Прекращение использования остановит сбор данных веб-сайтом с вашего устройства, но это не приведёт к автоматическому удалению информации, уже переданной Поставщику услуг или третьим лицам.",
        "Для запроса удаления ваших персональных данных, отзыва согласия или осуществления любого из ваших прав свяжитесь с Поставщик услуг по адресу help@mysaloon.uz.",
      ],
    },
    {
      title: "Политика хранения данных",
      body: "Поставщик услуг хранит персональные данные на основе их необходимости для заявленных целей:",
      bullets: [
        "Данные, предоставленные пользователем: Хранятся в течение использования вами Приложения и в течение 12 месяцев после этого, если только более длительное хранение не требуется законом",
        "Автоматически собранные данные: Хранятся до 24 месяцев с момента сбора, если только более длительное хранение не требуется для юридического соответствия",
        "Агрегированные и анонимизированные данные: Хранятся бессрочно, так как они больше не идентифицируют вас",
        "Данные, требуемые для юридического соответствия: Хранятся столько, сколько требуется применимым законом",
      ],
    },
    {
      title: "Удаление данных",
      body: "Вы можете запросить удаление ваших персональных данных или аккаунта, связавшись с Поставщик услуг по адресу help@mysaloon.uz. Поставщик услуг обработает ваш запрос в сроки, требуемые применимым законом. После проверки вашей личности Поставщик услуг удалит ваши персональные данные из своих систем, за исключением случаев, когда хранение требуется для юридического соответствия или законных бизнес-целей.",
    },
    {
      title: "Дети",
      body: "Приложение не предназначено для детей в возрасте до 13 лет или более высокого возраста, требуемого применимым законом. Поставщик услуг не сознательно собирает данные у детей или рекламирует Приложение им. Там, где согласие родителя или опекуна требуется применимым законом, Приложение не предназначено для использования без такого согласия. Поставщик услуг не сознательно собирает персональную информацию у детей в возрасте до 13 лет в нарушение применимого закона. В случае, если Поставщик услуг обнаружит, что ребёнок предоставил личную информацию, он немедленно удалит её со своих серверов. Если вы являетесь родителем или опекуном и знаете, что ваш ребёнок предоставил Поставщику услуг личную информацию, свяжитесь с Поставщик услуг (help@mysaloon.uz), чтобы они могли принять необходимые меры.",
    },
    {
      title: "Безопасность",
      body: "Поставщик услуг озабочен защитой конфиденциальности вашей информации. Поставщик услуг предоставляет физические, электронные и процедурные меры защиты для защиты информации, которую Поставщик услуг обрабатывает и хранит.",
    },
    {
      title: "Уведомление об утечке данных",
      body: "Если произойдёт утечка данных, затрагивающая ваши персональные данные, Поставщик услуг уведомит вас в соответствии с применимыми юридическими требованиями, включая, где требуется, предоставление информации о характере утечки и мерах, принимаемых для её устранения.",
    },
    {
      title: "Изменения",
      body: "Поставщик услуг может время от времени обновлять эту Политику конфиденциальности. Поставщик услуг уведомит вас о существенных изменениях, публикуя обновлённую Политику конфиденциальности с датой вступления в силу. Там, где это требуется законом, Поставщик услуг запросит ваше согласие на существенные изменения до их вступления в силу. Предыдущие версии этой Политики конфиденциальности будут поддерживаться и предоставляться по запросу, связавшись с Поставщик услуг по адресу help@mysaloon.uz.",
    },
    {
      title: "Ваше согласие",
      body: "Если обработка основана на согласии, вы предоставляете это согласие, активно подписываясь на соответствующую функцию или действие. Вы можете отозвать согласие в любое время, не затрагивая обработку, выполненную до отзыва. Обработка на других законных основаниях выполняется, как описано выше.",
    },
    {
      title: "Связаться с нами",
      body: "Если у вас есть вопросы относительно конфиденциальности при использовании Приложения или вопросы о практиках, свяжитесь с Поставщик услуг по электронной почте по адресу help@mysaloon.uz.",
    },
  ],
};

export function getPrivacyPolicy(lang: string | undefined): PrivacyPolicyDoc {
  const code = (lang ?? "uz").toLowerCase();
  if (code.startsWith("en")) return EN;
  if (code.startsWith("ru")) return RU;
  return UZ;
}
