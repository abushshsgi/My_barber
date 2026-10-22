export type TermsSection = {
  title: string;
  body?: string;
  bullets?: string[];
  link?: string;
};

export type TermsOfUseDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: TermsSection[];
  contactEmail: string;
  externalLink?: string;
};

const CONTACT_EMAIL = "help@mysaloon.uz";
const EXTERNAL_LINK = "https://doc-hosting.flycricket.io/mysaloon-terms-of-use/0135a7ee-d374-4758-b045-0f861aa55d4b/terms";

const EN: TermsOfUseDoc = {
  title: "Terms of Use",
  updated: "These terms of use are effective as of 2026-10-22",
  intro:
    "These terms of use apply to the Mysaloon app for mobile devices and web browsers, together with any related services operated by Abdurahim Oripov (collectively, the \"Application\"). Abdurahim Oripov is hereby referred to as the \"Service Provider\".",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "Acceptance of Terms",
      body: "By downloading, accessing, or using the Application, you agree to be bound by these Terms of Use. If you do not agree to these terms, you must not use the Application.",
    },
    {
      title: "Eligibility",
      body: "You must be at least 13 years of age to use the Application. By using the Application, you represent and warrant that you are at least 13 years old and have the legal capacity to enter into these terms.",
    },
    {
      title: "License to Use",
      body: "The Service Provider grants you a limited, non-exclusive, non-transferable, revocable license to use the Application for personal, non-commercial purposes in accordance with these terms.",
    },
    {
      title: "User Responsibilities",
      body: "You agree to use the Application only for lawful purposes and in accordance with these Terms of Use. You must not:",
      bullets: [
        "Use the Application for any illegal or unauthorized purpose",
        "Interfere with or disrupt the Application or servers",
        "Attempt to gain unauthorized access to any part of the Application",
        "Share your account credentials with others",
        "Use the Application to harass, abuse, or harm others",
      ],
    },
    {
      title: "Account Security",
      body: "You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify the Service Provider immediately of any unauthorized use of your account.",
    },
    {
      title: "Content and User Data",
      body: "You retain ownership of any content you submit to the Application. By submitting content, you grant the Service Provider a worldwide, non-exclusive, royalty-free license to use, reproduce, and display the content solely for the purpose of providing the Application services.",
    },
    {
      title: "Artificial Intelligence Features",
      body: "The Application includes AI-powered features such as style recommendations, face analysis, and virtual try-on. By using these features, you acknowledge that:",
      bullets: [
        "AI recommendations are based on algorithms and may not always be accurate",
        "The Service Provider is not responsible for decisions made based on AI suggestions",
        "Your images and data may be processed to improve AI accuracy",
      ],
    },
    {
      title: "Location Services",
      body: "The Application may request access to your device's location to provide location-based features such as finding nearby barbers. You can disable location services in your device settings, which may affect certain Application features.",
    },
    {
      title: "Bookings and Payments",
      body: "When you book appointments through the Application, you agree to:",
      bullets: [
        "Provide accurate and complete information",
        "Arrive on time for scheduled appointments",
        "Follow the barber's cancellation policy",
        "Pay any applicable fees for missed appointments",
      ],
    },
    {
      title: "Third-Party Services",
      body: "The Application may integrate with third-party services such as payment processors, mapping services, and social media platforms. Your use of these services is subject to their respective terms and privacy policies.",
    },
    {
      title: "Termination",
      body: "The Service Provider reserves the right to suspend or terminate your access to the Application at any time, with or without cause, with or without notice. Upon termination, your right to use the Application will immediately cease.",
    },
    {
      title: "Disclaimers",
      body: "The Application is provided on an \"as is\" and \"as available\" basis without warranties of any kind, either express or implied. The Service Provider does not warrant that the Application will be uninterrupted, secure, or error-free.",
    },
    {
      title: "Limitation of Liability",
      body: "To the maximum extent permitted by law, the Service Provider shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Application.",
    },
    {
      title: "Intellectual Property",
      body: "The Application and its original content, features, and functionality are owned by the Service Provider and are protected by international copyright, trademark, and other intellectual property laws.",
    },
    {
      title: "Changes to Terms",
      body: "The Service Provider may update these Terms of Use from time to time. Continued use of the Application after changes constitutes acceptance of the updated terms.",
    },
    {
      title: "Governing Law",
      body: "These Terms of Use shall be governed by and construed in accordance with the laws of the Republic of Uzbekistan, without regard to its conflict of law provisions.",
    },
    {
      title: "Contact Us",
      body: "If you have any questions about these Terms of Use, please contact the Service Provider at help@mysaloon.uz.",
    },
  ],
};

const UZ: TermsOfUseDoc = {
  title: "Foydalanish shartlari",
  updated: "Ushbu foydalanish shartlari 2026-10-22 yildan boshlab kuchga kiradi",
  intro:
    "Ushbu foydalanish shartlari mobil qurilmalar va veb-brauzerlar uchun Mysaloon ilovasiga, shuningdek Abdurahim Oripov tomonidan boshqariladigan bog'liq xizmatlarga (umumiy holda, \"Ilova\") taalluqli. Abdurahim Oripov ushbu hujjatda \"Xizmat ko'rsatuvchi\" sifatida ataladi.",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "Shartlarni qabul qilish",
      body: "Ilovani yuklab olish, kirish yoki ishlatish orqali siz ushbu Foydalanish shartlariga rioya qilishga rozilik bildirasiz. Agar ushbu shartlarga rozilik bildirmasangiz, Ilovadan foydalanmasligingiz kerak.",
    },
    {
      title: "Talablar",
      body: "Ilovadan foydalanish uchun kamida 13 yoshda bo'lishingiz kerak. Ilovadan foydalanish orqali siz kamida 13 yoshda ekanligingizni va ushbu shartlarga kirish huquqiga ega ekanligingizni tasdiqlaysiz.",
    },
    {
      title: "Foydalanish litsenziyasi",
      body: "Xizmat ko'rsatuvchi sizga ushbu shartlarga muvofiq shaxsiy, tijorat bo'lmagan maqsadlarda Ilovadan foydalanish uchun cheklangan, eksklyuziv bo'lmagan, o'tkazilmaydigan, bekor qilinadigan litsenziyani beradi.",
    },
    {
      title: "Foydalanuvchi majburiyatlari",
      body: "Siz Ilovadan faqat qonuniy maqsadlarda va ushbu Foydalanish shartlariga muvofiq foydalanishga rozilik bildirasiz. Siz quyidagilarni qilmasligingiz kerak:",
      bullets: [
        "Ilovani har qanday noqonuniy yoki ruxsatsiz maqsadlarda foydalanish",
        "Ilova yoki serverlarga aralashib, ularning ishiga xalaqit berish",
        "Ilovaning har qanday qismiga ruxsatsiz kirishga urinish",
        "Hisob ma'lumotlarini boshqalar bilan baham ko'rish",
        "Ilovadan boshqalarni ta'qib qilish, haqorat qilish yoki zarar yetkazish uchun foydalanish",
      ],
    },
    {
      title: "Hisob xavfsizligi",
      body: "Siz hisob ma'lumotlaringiz maxfiyligini saqlash va hisobingiz ostida sodir bo'ladigan barcha faoliyat uchun javobgarsiz. Hisobingizdan ruxsatsiz foydalanilganini darhol Xizmat ko'rsatuvchiga xabar berishga rozilik bildirasiz.",
    },
    {
      title: "Kontent va foydalanuvchi ma'lumotlari",
      body: "Siz Ilovaga yuborgan har qanday kontentga egalik huquqini saqlab qolasiz. Kontentni yuborish orqali siz Xizmat ko'rsatuvchiga Ilova xizmatlarini taqdim etish maqsadida kontentdan foydalanish, ko'paytirish va ko'rsatish uchun dunyo bo'ylab eksklyuziv bo'lmagan, royaltisiz litsenziyani berasiz.",
    },
    {
      title: "Sun'iy intellekt xususiyatlari",
      body: "Ilova uslub tavsiyalari, yuz tahlili va virtual sinash kabi AI quvvatlangan xususiyatlarni o'z ichiga oladi. Ushbu xususiyatlardan foydalanish orqali siz quyidagilarni tan olasiz:",
      bullets: [
        "AI tavsiyalari algoritmlarga asoslangan bo'lishi mumkin va har doim aniq bo'lmasligi mumkin",
        "Xizmat ko'rsatuvchi AI tavsiyalari asosida qabul qilingan qarorlar uchun javobgar emas",
        "Rasmlaringiz va ma'lumotlaringiz AI aniqligini yaxshilash uchun qayta ishlanishi mumkin",
      ],
    },
    {
      title: "Joylashuv xizmatlari",
      body: "Ilova yaqin atrofdagi sartaroshlarni topish kabi joylashuvga asoslangan xususiyatlarni taqdim etish uchun qurilmaning joylashuviga kirishni so'rashi mumkin. Qurilma sozlamalarida joylashuv xizmatlarini o'chirishingiz mumkin, bu Ilovaning ba'zi xususiyatlariga ta'sir qilishi mumkin.",
    },
    {
      title: "Bron qilish va to'lovlar",
      body: "Ilova orqali uchrashuvlarni bron qilganda, siz quyidagilarga rozilik bildirasiz:",
      bullets: [
        "Aniq va to'liq ma'lumotlarni taqdim etish",
        "Rejalashtirilgan uchrashuvlarga vaqtida kelish",
        "Sartaroshning bekor qilish siyosatiga rioya qilish",
        "O'tkazib yuborilgan uchrashuvlar uchun har qanday tegishli to'lovlarni to'lash",
      ],
    },
    {
      title: "Uchinchi tomon xizmatlari",
      body: "Ilova to'lov protsessorlari, xaritash xizmatlari va ijtimoiy media platformalari kabi uchinchi tomon xizmatlari bilan integratsiya qilinishi mumkin. Ushbu xizmatlardan foydalanishingiz ularning tegishli shartlari va maxfiylik siyosatlariga bo'ysunadi.",
    },
    {
      title: "Bekor qilish",
      body: "Xizmat ko'rsatuvchi istalgan vaqtda, sabab bilan yoki sababsiz, xabarnoma bilan yoki xabarnomasiz Ilovaga kirishingizni to'xtatib qo'yish yoki bekor qilish huquqini saqlab qoladi. Bekor qilingandan so'ng, Ilovadan foydalanish huquqingiz darhol tugaydi.",
    },
    {
      title: "Disclaimers",
      body: "Ilova \"qanday ekan\" va \"mavjud bo'lgan\" asosda, hech qanday kafolat bilan, ya'ni aniq yoki shartli bo'lmagan holda taqdim etiladi. Xizmat ko'rsatuvchi Ilovaning uzluksiz, xavfsiz yoki xatosiz bo'lishini kafolatlamaydi.",
    },
    {
      title: "Javobgarlikning cheklanishi",
      body: "Qonun ruxsat beradigan darajada, Xizmat ko'rsatuvchi Ilovadan foydalanishingiz natijasida kelib chiqadigan bilvosita, tasodifiy, maxsus, oqibatli yoki jazo shaklidagi zararlar uchun javobgar bo'lmaydi.",
    },
    {
      title: "Intellektual mulk",
      body: "Ilova va uning asl kontenti, xususiyatlari va funksionalligi Xizmat ko'rsatuvchiga tegishli va xalqaro mualliflik huquqi, savdo belgisi va boshqa intellektual mulk qonunlari bilan himoyalangan.",
    },
    {
      title: "Shartlardagi o'zgarishlar",
      body: "Xizmat ko'rsatuvchi vaqti-vaqti bilan ushbu Foydalanish shartlarini yangilashi mumkin. O'zgarishlardan keyin Ilovadan davom etgan foydalanish yangilangan shartlarni qabul qilish deb hisoblanadi.",
    },
    {
      title: "Qo'llanadigan qonun",
      body: "Ushbu Foydalanish shartlari O'zbekiston Respublikasi qonunlariga, shu jumladan uning qonun ziddiyati qoidalariga e'tibor bermasdan, muvofiq ravishda boshqariladi va talqin etiladi.",
    },
    {
      title: "Biz bilan bog'lanish",
      body: "Ushbu Foydalanish shartlari haqida savollaringiz bo'lsa, Xizmat ko'rsatuvchiga help@mysaloon.uz manzili orqali murojaat qiling.",
    },
  ],
};

const RU: TermsOfUseDoc = {
  title: "Условия использования",
  updated: "Эти условия использования вступают в силу с 2026-10-22",
  intro:
    "Эти условия использования применяются к приложению Mysaloon для мобильных устройств и веб-браузеров, а также к любым связанным услугам, управляемым Абдурахимом Ориповым (совместно именуемым «Приложение»). Абдурахим Орипов именуется в этом документе как «Поставщик услуг».",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "Принятие условий",
      body: "Загружая, получая доступ или используя Приложение, вы соглашаетесь соблюдать эти Условия использования. Если вы не согласны с этими условиями, вы не должны использовать Приложение.",
    },
    {
      title: "Требования",
      body: "Вам должно быть не менее 13 лет для использования Приложения. Используя Приложение, вы подтверждаете и гарантируете, что вам не менее 13 лет и вы имеете юридическую правоспособность для вступления в эти условия.",
    },
    {
      title: "Лицензия на использование",
      body: "Поставщик услуг предоставляет вам ограниченную, неисключительную, непередаваемую, отменяемую лицензию на использование Приложения для личных, некоммерческих целей в соответствии с этими условиями.",
    },
    {
      title: "Обязанности пользователя",
      body: "Вы соглашаетесь использовать Приложение только для законных целей и в соответствии с этими Условиями использования. Вы не должны:",
      bullets: [
        "Использовать Приложение для любых незаконных или несанкционированных целей",
        "Вмешиваться в работу Приложения или серверов",
        "Пытаться получить несанкционированный доступ к любой части Приложения",
        "Делиться учетными данными с другими",
        "Использовать Приложение для домогательства, оскорбления или причинения вреда другим",
      ],
    },
    {
      title: "Безопасность аккаунта",
      body: "Вы несете ответственность за сохранение конфиденциальности информации вашего аккаунта и за все действия, происходящие под вашим аккаунтом. Вы соглашаетесь немедленно уведомить Поставщика услуг о любом несанкционированном использовании вашего аккаунта.",
    },
    {
      title: "Контент и данные пользователя",
      body: "Вы сохраняете право собственности на любой контент, который вы отправляете в Приложение. Отправляя контент, вы предоставляете Поставщику услуг всемирную, неисключительную, безлицензионную лицензию на использование, воспроизведение и отображение контента исключительно для предоставления услуг Приложения.",
    },
    {
      title: "Функции искусственного интеллекта",
      body: "Приложение включает функции на базе ИИ, такие как рекомендации стиля, анализ лица и виртуальная примерка. Используя эти функции, вы признаете, что:",
      bullets: [
        "Рекомендации ИИ основаны на алгоритмах и могут не всегда быть точными",
        "Поставщик услуг не несет ответственности за решения, принятые на основе предложений ИИ",
        "Ваши изображения и данные могут обрабатываться для улучшения точности ИИ",
      ],
    },
    {
      title: "Службы геолокации",
      body: "Приложение может запросить доступ к местоположению вашего устройства для предоставления функций на основе местоположения, таких как поиск ближайших парикмахеров. Вы можете отключить службы геолокации в настройках устройства, что может повлиять на некоторые функции Приложения.",
    },
    {
      title: "Бронирование и платежи",
      body: "При бронировании встреч через Приложение вы соглашаетесь:",
      bullets: [
        "Предоставлять точную и полную информацию",
        "Приходить вовремя на запланированные встречи",
        "Соблюдать политику отмены парикмахера",
        "Оплачивать любые применимые сборы за пропущенные встречи",
      ],
    },
    {
      title: "Сторонние сервисы",
      body: "Приложение может интегрироваться со сторонними сервисами, такими как процессоры платежей, картографические сервисы и платформы социальных сетей. Ваше использование этих сервисов регулируется их соответствующими условиями и политиками конфиденциальности.",
    },
    {
      title: "Прекращение",
      body: "Поставщик услуг оставляет за собой право приостановить или прекратить ваш доступ к Приложению в любое время, с причиной или без причины, с уведомлением или без уведомления. При прекращении ваше право на использование Приложения немедленно прекращается.",
    },
    {
      title: "Отказ от ответственности",
      body: "Приложение предоставляется «как есть» и «как доступно» без каких-либо гарантий, явных или подразумеваемых. Поставщик услуг не гарантирует, что Приложение будет работать без перебоев, безопасно или без ошибок.",
    },
    {
      title: "Ограничение ответственности",
      body: "В максимальной степени, разрешенной законом, Поставщик услуг не несет ответственности за любые косвенные, случайные, специальные, косвенные или штрафные убытки, возникшие в результате вашего использования Приложения.",
    },
    {
      title: "Интеллектуальная собственность",
      body: "Приложение и его оригинальный контент, функции и функциональность принадлежат Поставщику услуг и защищены международными законами об авторском праве, товарных знаках и другой интеллектуальной собственностью.",
    },
    {
      title: "Изменения в условиях",
      body: "Поставщик услуг может время от времени обновлять эти Условия использования. Продолжение использования Приложения после изменений означает принятие обновленных условий.",
    },
    {
      title: "Применимое право",
      body: "Эти Условия использования регулируются и толкуются в соответствии с законами Республики Узбекистан, без учета положений о коллизионном праве.",
    },
    {
      title: "Свяжитесь с нами",
      body: "Если у вас есть вопросы об этих Условиях использования, пожалуйста, свяжитесь с Поставщиком услуг по адресу help@mysaloon.uz.",
    },
  ],
};

export function getTermsOfUse(lang: string): TermsOfUseDoc {
  if (lang === "uz") return UZ;
  if (lang === "ru") return RU;
  return EN;
}
