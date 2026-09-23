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

const CONTACT_EMAIL = "support@mysaloon.uz";

const EN: PrivacyPolicyDoc = {
  title: "Privacy Policy",
  updated: "Last updated: September 2026",
  intro:
    'MySaloon ("we", "our", or "us") operates the MySaloon mobile application and Morf AI features. This page informs you of our policies regarding the collection, use, and disclosure of Personal Information when you use our Service.',
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "1. Information collection and use",
      body: "We collect several different types of information for various purposes to provide and improve our Service to you:",
      bullets: [
        "Personal Data: Name, phone number, email address.",
        "User Content & Photos: Hair/facial photos and personal care preferences uploaded for Morf AI analysis.",
        "Usage Data: Device IP address, app features used, and crash logs.",
      ],
    },
    {
      title: "2. Use of AI services and images",
      body: "Photos and inputs provided for Morf AI are solely processed to generate personalized hair care plans and grooming recommendations. We do not sell or publicly share your personal images with unauthorized third parties.",
    },
    {
      title: "3. Third-party service providers",
      body: "We may employ third-party companies and individuals to facilitate our Service (e.g., Firebase, AI Infrastructure APIs, Payment Gateways like Click/Payme). These third parties have access to your Personal Data only to perform these tasks on our behalf.",
    },
    {
      title: "4. Data deletion requests",
      body: "You have the right to request the deletion of your account and associated personal data at any time. You can request deletion directly in the app settings or by contacting us at support@mysaloon.uz.",
    },
    {
      title: "5. Security of data",
      body: "The security of your data is important to us, but remember that no method of transmission over the Internet is 100% secure.",
    },
    {
      title: "6. Contact us",
      body: "If you have any questions about this Privacy Policy, please contact us by email:",
    },
  ],
};

const UZ: PrivacyPolicyDoc = {
  title: "Maxfiylik siyosati",
  updated: "Oxirgi yangilanish: sentabr 2026",
  intro:
    'MySaloon ("biz") MySaloon mobil ilovasi va Morf AI funksiyalarini boshqaradi. Bu sahifa Xizmatdan foydalanganingizda shaxsiy maʼlumotlarni yigʻish, ishlatish va oshkor qilish siyosatimiz haqida xabar beradi.',
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "1. Maʼlumotlarni yigʻish va ishlatish",
      body: "Xizmatni taqdim etish va yaxshilash uchun bir necha turdagi maʼlumotlarni yigʻamiz:",
      bullets: [
        "Shaxsiy maʼlumotlar: ism, telefon raqami, elektron pochta.",
        "Foydalanuvchi kontenti va suratlar: Morf AI tahlili uchun yuklangan soch va yuz suratlari hamda parvarish afzalliklari.",
        "Foydalanish maʼlumotlari: qurilma IP manzili, ishlatilgan ilova funksiyalari va nosozlik jurnallari.",
      ],
    },
    {
      title: "2. AI xizmatlari va tasvirlar",
      body: "Morf AI uchun berilgan suratlar va kiritmalar faqat shaxsiy soch parvarishi rejalari va grooming tavsiyalarini yaratish uchun qayta ishlanadi. Shaxsiy tasvirlaringizni ruxsatsiz uchinchi shaxslarga sotmaymiz va ommaviy ulashmaymiz.",
    },
    {
      title: "3. Uchinchi tomon xizmatlari",
      body: "Xizmatni taʼminlash uchun uchinchi tomon kompaniya va shaxslarni jalb qilishimiz mumkin (masalan, Firebase, AI infratuzilma API lari, Click va Payme kabi toʻlov shlyuzlari). Ular shaxsiy maʼlumotlaringizga faqat shu vazifalarni bizning nomimizdan bajarish uchun kirishadi.",
    },
    {
      title: "4. Maʼlumotlarni oʻchirish soʻrovlari",
      body: "Hisobingiz va unga bogʻliq shaxsiy maʼlumotlarni istalgan vaqtda oʻchirishni soʻrash huquqiga egasiz. Oʻchirishni ilova sozlamalaridan yoki support@mysaloon.uz orqali soʻrashingiz mumkin.",
    },
    {
      title: "5. Maʼlumotlar xavfsizligi",
      body: "Maʼlumotlaringiz xavfsizligi biz uchun muhim, biroq internet orqali uzatishning hech bir usuli 100% xavfsiz emas.",
    },
    {
      title: "6. Biz bilan bogʻlanish",
      body: "Ushbu Maxfiylik siyosati boʻyicha savollaringiz boʻlsa, elektron pochta orqali yozing:",
    },
  ],
};

const RU: PrivacyPolicyDoc = {
  title: "Политика конфиденциальности",
  updated: "Последнее обновление: сентябрь 2026",
  intro:
    "MySaloon («мы») управляет мобильным приложением MySaloon и функциями Morf AI. Эта страница описывает наши правила сбора, использования и раскрытия персональных данных при использовании Сервиса.",
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "1. Сбор и использование информации",
      body: "Мы собираем несколько видов информации, чтобы предоставлять и улучшать Сервис:",
      bullets: [
        "Персональные данные: имя, номер телефона, адрес электронной почты.",
        "Контент и фото: фото волос и лица, а также предпочтения по уходу, загруженные для анализа Morf AI.",
        "Данные об использовании: IP-адрес устройства, используемые функции приложения и журналы сбоев.",
      ],
    },
    {
      title: "2. Использование AI-сервисов и изображений",
      body: "Фото и данные, переданные для Morf AI, обрабатываются только для персональных планов ухода за волосами и рекомендаций по грумингу. Мы не продаём и не публично передаём ваши личные изображения неуполномоченным третьим лицам.",
    },
    {
      title: "3. Сторонние поставщики",
      body: "Мы можем привлекать сторонние компании и лиц для работы Сервиса (например, Firebase, API AI-инфраструктуры, платёжные шлюзы Click и Payme). Они получают доступ к персональным данным только для выполнения этих задач от нашего имени.",
    },
    {
      title: "4. Запросы на удаление данных",
      body: "Вы вправе в любой момент запросить удаление аккаунта и связанных персональных данных. Запрос можно отправить в настройках приложения или на support@mysaloon.uz.",
    },
    {
      title: "5. Безопасность данных",
      body: "Безопасность ваших данных важна для нас, однако ни один способ передачи через интернет не является на 100% безопасным.",
    },
    {
      title: "6. Контакты",
      body: "Если у вас есть вопросы об этой Политике конфиденциальности, напишите нам по электронной почте:",
    },
  ],
};

export function getPrivacyPolicy(lang: string | undefined): PrivacyPolicyDoc {
  const code = (lang ?? "uz").toLowerCase();
  if (code.startsWith("en")) return EN;
  if (code.startsWith("ru")) return RU;
  return UZ;
}
