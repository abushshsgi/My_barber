import type { SeoLocale } from "../constants";
import type { SeoPageCopy } from "../types";

export type LandingPageId =
  | "home"
  | "morf-ai-hub"
  | "morf-ai-try-on"
  | "morf-ai-hairstyles"
  | "morf-ai-hair-care"
  | "morf-ai-ingredient-scanner"
  | "morf-ai-chat"
  | "morf-ai-weather-care"
  | "booking-landing"
  | "for-salons"
  | "map"
  | "explore"
  | "privacy-policy"
  | "terms-of-use";

export type LandingPageDef = {
  id: LandingPageId;
  uzPath: string;
  trilingual: boolean;
  indexable: boolean;
  sitemap: boolean;
  priority: number;
  changefreq: "daily" | "weekly" | "monthly";
};

export const LANDING_PAGES: LandingPageDef[] = [
  { id: "home", uzPath: "/", trilingual: true, indexable: true, sitemap: true, priority: 1, changefreq: "daily" },
  { id: "morf-ai-hub", uzPath: "/morf-ai", trilingual: true, indexable: true, sitemap: true, priority: 0.9, changefreq: "weekly" },
  { id: "morf-ai-try-on", uzPath: "/morf-ai/try-on", trilingual: true, indexable: true, sitemap: true, priority: 0.85, changefreq: "weekly" },
  { id: "morf-ai-hairstyles", uzPath: "/morf-ai/hairstyles", trilingual: true, indexable: true, sitemap: true, priority: 0.85, changefreq: "weekly" },
  { id: "morf-ai-hair-care", uzPath: "/morf-ai/hair-care", trilingual: true, indexable: true, sitemap: true, priority: 0.8, changefreq: "weekly" },
  { id: "morf-ai-ingredient-scanner", uzPath: "/morf-ai/ingredient-scanner", trilingual: true, indexable: true, sitemap: true, priority: 0.8, changefreq: "weekly" },
  { id: "morf-ai-chat", uzPath: "/morf-ai/chat", trilingual: true, indexable: true, sitemap: true, priority: 0.8, changefreq: "weekly" },
  { id: "morf-ai-weather-care", uzPath: "/morf-ai/weather-care", trilingual: true, indexable: true, sitemap: true, priority: 0.75, changefreq: "weekly" },
  { id: "booking-landing", uzPath: "/booking", trilingual: true, indexable: true, sitemap: true, priority: 0.85, changefreq: "weekly" },
  { id: "for-salons", uzPath: "/for-salons", trilingual: false, indexable: true, sitemap: true, priority: 0.7, changefreq: "monthly" },
  { id: "map", uzPath: "/map", trilingual: false, indexable: true, sitemap: true, priority: 0.8, changefreq: "daily" },
  { id: "explore", uzPath: "/explore", trilingual: false, indexable: true, sitemap: true, priority: 0.85, changefreq: "daily" },
  { id: "privacy-policy", uzPath: "/privacy-policy", trilingual: false, indexable: true, sitemap: true, priority: 0.3, changefreq: "monthly" },
  { id: "terms-of-use", uzPath: "/terms-of-use", trilingual: false, indexable: true, sitemap: true, priority: 0.3, changefreq: "monthly" },
];

type CopyMap = Record<LandingPageId, Record<SeoLocale, SeoPageCopy>>;

export const LANDING_COPY: CopyMap = {
  home: {
    uz: {
      title: "mysaloon.uz — Sartaroshxona va salonlarni onlayn band qiling",
      description:
        "O'zbekistondagi sartaroshlar va go'zallik salonlarini xaritada toping, bo'sh vaqtlarni ko'ring va bir necha bosishda bron qiling.",
      h1: "Salon va sartaroshxonalarni onlayn band qiling",
      keywords: "salon bron, sartarosh, mysaloon, o'zbekiston",
      intro:
        "MySaloon — yaqin atrofdagi salonlar, haqiqiy bo'sh slotlar va ishonchli bron. Morf AI bilan yangi soch uslubini oldindan ko'ring.",
      bullets: ["Xarita va filterlar", "Onlayn to'lov va eslatmalar", "Morf AI try-on"],
      ctaLabel: "Salonlarni ko'rish",
      ctaHref: "/map",
      secondaryCta: { label: "Morf AI sinab ko'rish", href: "/ai-style" },
    },
    ru: {
      title: "mysaloon.uz — Онлайн-запись в барбершопы и салоны",
      description:
        "Найдите барбершопы и салоны красоты в Узбекистане на карте, выберите свободное время и забронируйте за пару кликов.",
      h1: "Онлайн-запись в салоны и барбершопы",
      keywords: "запись салон, барбершоп, узбекистан",
      intro: "MySaloon — карта салонов, реальные свободные слоты и надёжное бронирование. Примерьте причёску заранее с Morf AI.",
      bullets: ["Карта и фильтры", "Онлайн-оплата и напоминания", "Виртуальный try-on Morf AI"],
      ctaLabel: "Смотреть салоны",
      ctaHref: "/map",
      secondaryCta: { label: "Попробовать Morf AI", href: "/ai-style" },
    },
    en: {
      title: "mysaloon.uz — Book barbershops and salons online",
      description:
        "Discover barbers and beauty salons in Uzbekistan on the map, check real availability, and book in a few taps.",
      h1: "Book salons and barbershops online",
      keywords: "salon booking, barber, uzbekistan",
      intro:
        "MySaloon shows nearby salons, live open slots, and secure booking. Preview a new hairstyle with Morf AI before you visit.",
      bullets: ["Map and filters", "Online pay and reminders", "Morf AI virtual try-on"],
      ctaLabel: "Browse salons",
      ctaHref: "/map",
      secondaryCta: { label: "Try Morf AI", href: "/ai-style" },
    },
  },
  "morf-ai-hub": {
    uz: {
      title: "Morf AI — Soch uslubini selfie bilan sinab ko'ring | mysaloon.uz",
      description:
        "Morf AI ekotizimi: virtual try-on, AI chat, parvarish markazi, ingredient skaneri va haqiqiy salon bron.",
      h1: "Morf AI — sochingiz uchun aqlli yordamchi",
      intro: "MySaloon ichidagi Morf AI yangi uslubni selfieda ko'rish, parvarish rejasini tuzish va ustadan maslahat olish imkonini beradi.",
      bullets: ["Virtual try-on", "AI maslahatchi", "Parvarish va ingredient tahlili"],
      ctaLabel: "Try-on boshlash",
      ctaHref: "/ai-style",
      secondaryCta: { label: "Soch katalogi", href: "/explore" },
      faq: [
        {
          question: "Morf AI bepulmi?",
          answer: "Asosiy try-on va chat mehmon sifatida ochiq; ba'zi limitlar obuna bilan kengayadi.",
        },
        {
          question: "Natija qanchalik aniq?",
          answer: "AI vizual taxmin beradi; yakuniy natija ustangizning kasbiy ishi.",
        },
      ],
    },
    ru: {
      title: "Morf AI — Примерьте причёску по селфи | mysaloon.uz",
      description:
        "Экосистема Morf AI: виртуальный try-on, AI-чат, уход, сканер состава и запись в салон.",
      h1: "Morf AI — умный помощник для волос",
      intro: "Morf AI в MySaloon помогает примерить стиль, собрать уход и получить совет перед визитом в салон.",
      bullets: ["Виртуальный try-on", "AI-консультант", "Уход и анализ состава"],
      ctaLabel: "Начать try-on",
      ctaHref: "/ai-style",
      secondaryCta: { label: "Каталог стилей", href: "/explore" },
    },
    en: {
      title: "Morf AI — Try hairstyles on your selfie | mysaloon.uz",
      description:
        "The Morf AI ecosystem: virtual try-on, AI chat, hair care hub, ingredient scanner, and salon booking.",
      h1: "Morf AI — smart guidance for your hair",
      intro: "Morf AI inside MySaloon lets you preview styles, plan care, and get advice before visiting a stylist.",
      bullets: ["Virtual try-on", "AI advisor", "Care and ingredient scan"],
      ctaLabel: "Start try-on",
      ctaHref: "/ai-style",
      secondaryCta: { label: "Hairstyle catalog", href: "/explore" },
    },
  },
  "morf-ai-try-on": {
    uz: {
      title: "Virtual try-on — selfie bilan soch uslubi | Morf AI",
      description: "Bir selfie yuklang, minglab tayyor uslublardan tanlang va natijani soniyalarda ko'ring.",
      h1: "Selfie bilan soch uslubini sinab ko'ring",
      intro: "Morf AI try-on realistik vizual natija beradi — keyin yaqin salonni topib bron qiling.",
      ctaLabel: "Try-on ochish",
      ctaHref: "/ai-style",
    },
    ru: {
      title: "Виртуальный try-on по селфи | Morf AI",
      description: "Загрузите селфи, выберите стиль из каталога и увидите результат за секунды.",
      h1: "Примерьте причёску на селфи",
      intro: "Try-on Morf AI показывает визуальный результат — затем запишитесь в ближайший салон.",
      ctaLabel: "Открыть try-on",
      ctaHref: "/ai-style",
    },
    en: {
      title: "Virtual try-on on your selfie | Morf AI",
      description: "Upload a selfie, pick a style from the catalog, and preview the result in seconds.",
      h1: "Try a hairstyle on your selfie",
      intro: "Morf AI try-on gives a visual preview — then book a nearby salon.",
      ctaLabel: "Open try-on",
      ctaHref: "/ai-style",
    },
  },
  "morf-ai-hairstyles": {
    uz: {
      title: "Soch uslublari katalogi — erkak va ayol | Morf AI",
      description: "Trend uslublar, persona suratlari va har bir uslub uchun try-on havolasi.",
      h1: "Soch uslublari katalogi",
      intro: "Explore bo'limida filterlar, yuz shakli va uzunlik bo'yicha qidiruv.",
      ctaLabel: "Katalogga o'tish",
      ctaHref: "/explore",
    },
    ru: {
      title: "Каталог причёсок — мужские и женские | Morf AI",
      description: "Трендовые стили с примерами и ссылкой на try-on.",
      h1: "Каталог причёсок",
      intro: "В разделе Explore — фильтры по форме лица и длине волос.",
      ctaLabel: "Перейти в каталог",
      ctaHref: "/explore",
    },
    en: {
      title: "Hairstyle catalog — men's and women's | Morf AI",
      description: "Trending cuts with previews and a link to try each style on.",
      h1: "Hairstyle catalog",
      intro: "Explore offers filters by face shape and hair length.",
      ctaLabel: "Open catalog",
      ctaHref: "/explore",
    },
  },
  "morf-ai-hair-care": {
    uz: {
      title: "Soch parvarishi markazi — reja va maslahat | Morf AI",
      description: "Shaxsiy parvarish rejasi, mahsulotlar va AI maslahatlari.",
      h1: "Soch parvarishi markazi",
      intro: "Hair Care profilingiz va kundalik rutinangizni Morf AI bilan boshqaring.",
      ctaLabel: "Parvarish markaziga",
      ctaHref: "/ai-style/care",
    },
    ru: {
      title: "Центр ухода за волосами | Morf AI",
      description: "Персональный план ухода, продукты и AI-советы.",
      h1: "Центр ухода за волосами",
      intro: "Соберите рутину и профиль ухода в Morf AI.",
      ctaLabel: "Открыть уход",
      ctaHref: "/ai-style/care",
    },
    en: {
      title: "Hair care hub — routines and advice | Morf AI",
      description: "Personal care plan, products, and AI guidance.",
      h1: "Hair care hub",
      intro: "Build your care profile and daily routine with Morf AI.",
      ctaLabel: "Open care hub",
      ctaHref: "/ai-style/care",
    },
  },
  "morf-ai-ingredient-scanner": {
    uz: {
      title: "Shampun tarkibi skaneri — Hair Advisor | Morf AI",
      description: "Mahsulot yorlig'ini skaner qiling, ingredientlarni tushuning va mosligini tekshiring.",
      h1: "Ingredient skaneri",
      intro: "Hair Advisor 2 yorliq va shtrix-kod orqali tarkibni tahlil qiladi.",
      ctaLabel: "Skaner ochish",
      ctaHref: "/ai-style/care/ingredient",
    },
    ru: {
      title: "Сканер состава шампуня | Morf AI",
      description: "Сканируйте этикетку и проверьте совместимость ингредиентов.",
      h1: "Сканер состава",
      intro: "Hair Advisor 2 анализирует этикетку и штрих-код.",
      ctaLabel: "Открыть сканер",
      ctaHref: "/ai-style/care/ingredient",
    },
    en: {
      title: "Shampoo ingredient scanner | Morf AI",
      description: "Scan the label, understand ingredients, and check fit for your hair.",
      h1: "Ingredient scanner",
      intro: "Hair Advisor 2 reads labels and barcodes for you.",
      ctaLabel: "Open scanner",
      ctaHref: "/ai-style/care/ingredient",
    },
  },
  "morf-ai-chat": {
    uz: {
      title: "Morf AI chat — soch bo'yicha maslahat",
      description: "AI bilan suhbat: uslub, parvarish va salonga tayyorgarlik.",
      h1: "AI maslahatchi chat",
      intro: "Savollaringizni yozing — Morf AI amaliy maslahat beradi.",
      ctaLabel: "Chatni ochish",
      ctaHref: "/ai-style/chat",
    },
    ru: {
      title: "Чат Morf AI — советы по волосам",
      description: "Диалог с AI о стиле, уходе и подготовке к визиту.",
      h1: "AI-консультант в чате",
      intro: "Задайте вопрос — Morf AI даст практичный ответ.",
      ctaLabel: "Открыть чат",
      ctaHref: "/ai-style/chat",
    },
    en: {
      title: "Morf AI chat — hair advice",
      description: "Talk with AI about style, care, and your salon visit.",
      h1: "AI advisor chat",
      intro: "Ask questions — Morf AI replies with practical tips.",
      ctaLabel: "Open chat",
      ctaHref: "/ai-style/chat",
    },
  },
  "morf-ai-weather-care": {
    uz: {
      title: "Ob-havo bo'yicha soch parvarishi | Morf AI",
      description: "Bugungi ob-havoga mos parvarish tavsiyalari — namlik, shamol va quyosh hisobga olinadi.",
      h1: "Ob-havo parvarishi",
      intro: "CareWeatherPanel real ob-havo ma'lumotiga asoslangan kunlik maslahatlar beradi.",
      ctaLabel: "Parvarish markaziga",
      ctaHref: "/ai-style/care",
      faq: [
        {
          question: "Ma'lumot qayerdan keladi?",
          answer: "Ob-havo API orqali — shaxsiy joylashuv ixtiyoriy.",
        },
      ],
    },
    ru: {
      title: "Уход с учётом погоды | Morf AI",
      description: "Советы по уходу под сегодняшнюю погоду.",
      h1: "Уход с учётом погоды",
      intro: "Панель Care Weather даёт ежедневные рекомендации по погоде.",
      ctaLabel: "К уходу",
      ctaHref: "/ai-style/care",
    },
    en: {
      title: "Weather-aware hair care | Morf AI",
      description: "Daily care tips aligned with today's weather.",
      h1: "Weather-aware care",
      intro: "Care Weather uses live weather data for practical tips.",
      ctaLabel: "Go to care hub",
      ctaHref: "/ai-style/care",
    },
  },
  "booking-landing": {
    uz: {
      title: "Salon bron qilish — bo'sh vaqtlar va onlayn to'lov",
      description: "Yaqin salonni tanlang, xizmat va ustani belgilang, tasdiqlang.",
      h1: "Salonni onlayn band qiling",
      intro: "Xaritadan salon tanlang yoki sevimli ustangiz profilidan bron qiling.",
      ctaLabel: "Xaritani ochish",
      ctaHref: "/map",
      secondaryCta: { label: "Bugungi bo'sh slotlar", href: "/today" },
    },
    ru: {
      title: "Запись в салон — свободное время и оплата",
      description: "Выберите салон, услугу и мастера, подтвердите запись.",
      h1: "Забронируйте салон онлайн",
      intro: "Найдите салон на карте или запишитесь через профиль мастера.",
      ctaLabel: "Открыть карту",
      ctaHref: "/map",
      secondaryCta: { label: "Свободно сегодня", href: "/today" },
    },
    en: {
      title: "Book a salon — live availability",
      description: "Pick a salon, service, and stylist, then confirm online.",
      h1: "Book your salon online",
      intro: "Choose from the map or book from your favorite barber's profile.",
      ctaLabel: "Open map",
      ctaHref: "/map",
      secondaryCta: { label: "Open slots today", href: "/today" },
    },
  },
  "for-salons": {
    uz: {
      title: "Salon egalari uchun — MySaloon Partner",
      description: "Onlayn bron, mijozlar va TOP ko'rinish. Bepul boshlash.",
      h1: "Saloningiz uchun MySaloon",
      intro: "Partner kabineti orqali jadval, xizmatlar va to'lovlarni boshqaring.",
      ctaLabel: "Partnerga qo'shilish",
      ctaHref: "/for-salons",
    },
    ru: {
      title: "Для владельцев салонов — MySaloon Partner",
      description: "Онлайн-запись, клиенты и продвижение.",
      h1: "MySaloon для вашего салона",
      intro: "Управляйте расписанием и услугами в партнёрском кабинете.",
      ctaLabel: "Стать партнёром",
      ctaHref: "/for-salons",
    },
    en: {
      title: "For salon owners — MySaloon Partner",
      description: "Online booking, clients, and visibility tools.",
      h1: "MySaloon for your salon",
      intro: "Run schedule, services, and payments from the partner dashboard.",
      ctaLabel: "Join as partner",
      ctaHref: "/for-salons",
    },
  },
  map: {
    uz: {
      title: "Salon xaritasi — yaqin sartaroshxonalarni toping",
      description: "Joylashuv bo'yicha salonlar, reyting va bo'sh vaqtlar.",
      h1: "Salon xaritasi",
      intro: "Filterlar bilan shahringizdagi salonlarni qidiring.",
      ctaLabel: "Xaritada qidirish",
      ctaHref: "/map",
    },
    ru: { title: "Карта салонов", description: "Салоны рядом с вами.", h1: "Карта салонов", intro: "", ctaLabel: "Карта", ctaHref: "/map" },
    en: { title: "Salon map", description: "Salons near you.", h1: "Salon map", intro: "", ctaLabel: "Map", ctaHref: "/map" },
  },
  explore: {
    uz: {
      title: "Soch uslublari — katalog va try-on",
      description: "Erkak va ayol uslublari, persona suratlari.",
      h1: "Soch uslublari katalogi",
      intro: "Har bir uslub uchun try-on va yaqin salon.",
      ctaLabel: "Katalogni ochish",
      ctaHref: "/explore",
    },
    ru: { title: "Каталог стилей", description: "Мужские и женские причёски.", h1: "Каталог стилей", intro: "", ctaLabel: "Каталог", ctaHref: "/explore" },
    en: { title: "Hairstyle catalog", description: "Men's and women's styles.", h1: "Style catalog", intro: "", ctaLabel: "Explore", ctaHref: "/explore" },
  },
  "privacy-policy": {
    uz: {
      title: "Maxfiylik siyosati — mysaloon.uz",
      description: "MySaloon va Morf AI ma'lumotlaringizni qanday himoya qiladi.",
      h1: "Maxfiylik siyosati",
      intro: "",
      ctaLabel: "Bosh sahifa",
      ctaHref: "/",
    },
    ru: {
      title: "Политика конфиденциальности",
      description: "Как MySaloon обрабатывает данные.",
      h1: "Политика конфиденциальности",
      intro: "",
      ctaLabel: "Главная",
      ctaHref: "/",
    },
    en: {
      title: "Privacy policy — mysaloon.uz",
      description: "How MySaloon and Morf AI handle your data.",
      h1: "Privacy policy",
      intro: "",
      ctaLabel: "Home",
      ctaHref: "/",
    },
  },
  "terms-of-use": {
    uz: {
      title: "Foydalanish shartlari — mysaloon.uz",
      description: "Platformadan foydalanish qoidalari.",
      h1: "Foydalanish shartlari",
      intro: "",
      ctaLabel: "Bosh sahifa",
      ctaHref: "/",
    },
    ru: {
      title: "Условия использования",
      description: "Правила платформы.",
      h1: "Условия использования",
      intro: "",
      ctaLabel: "Главная",
      ctaHref: "/",
    },
    en: {
      title: "Terms of use — mysaloon.uz",
      description: "Platform terms.",
      h1: "Terms of use",
      intro: "",
      ctaLabel: "Home",
      ctaHref: "/",
    },
  },
};