export type TermsSection = {
  title: string;
  body?: string;
  bullets?: string[];
};

export type TermsOfUseDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: TermsSection[];
  contactEmail: string;
};

const CONTACT_EMAIL = "support@mysaloon.uz";

const EN: TermsOfUseDoc = {
  title: "Terms of Use",
  updated: "Last updated: September 2026",
  intro:
    'MySaloon ("we", "our", or "us") operates the MySaloon mobile application and Morf AI features. By downloading, accessing, or using the Application, you agree to be bound by these Terms of Use.',
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "1. Acceptance of Terms",
      body: "By downloading, accessing, or using the Application, you agree to be bound by these Terms of Use. If you do not agree to these terms, you must not use the Application.",
    },
    {
      title: "2. Eligibility",
      body: "You must be at least 13 years of age to use the Application. By using the Application, you represent and warrant that you are at least 13 years old and have the legal capacity to enter into these terms.",
    },
    {
      title: "3. License to Use",
      body: "The Service Provider grants you a limited, non-exclusive, non-transferable, revocable license to use the Application for personal, non-commercial purposes in accordance with these terms.",
    },
    {
      title: "4. User Responsibilities",
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
      title: "5. Account Security",
      body: "You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify the Service Provider immediately of any unauthorized use of your account.",
    },
    {
      title: "6. Content and User Data",
      body: "You retain ownership of any content you submit to the Application. By submitting content, you grant the Service Provider a worldwide, non-exclusive, royalty-free license to use, reproduce, and display the content solely for the purpose of providing the Application services.",
    },
    {
      title: "7. Artificial Intelligence Features",
      body: "The Application includes AI-powered features such as style recommendations, face analysis, and virtual try-on. By using these features, you acknowledge that:",
      bullets: [
        "AI recommendations are based on algorithms and may not always be accurate",
        "The Service Provider is not responsible for decisions made based on AI suggestions",
        "Your images and data may be processed to improve AI accuracy",
      ],
    },
    {
      title: "8. Location Services",
      body: "The Application may request access to your device's location to provide location-based features such as finding nearby barbers. You can disable location services in your device settings, which may affect certain Application features.",
    },
    {
      title: "9. Bookings and Payments",
      body: "When you book appointments through the Application, you agree to:",
      bullets: [
        "Provide accurate and complete information",
        "Arrive on time for scheduled appointments",
        "Follow the barber's cancellation policy",
        "Pay any applicable fees for missed appointments",
      ],
    },
    {
      title: "10. Third-Party Services",
      body: "The Application may integrate with third-party services such as payment processors, mapping services, and social media platforms. Your use of these services is subject to their respective terms and privacy policies.",
    },
    {
      title: "11. Termination",
      body: "The Service Provider reserves the right to suspend or terminate your access to the Application at any time, with or without cause, with or without notice. Upon termination, your right to use the Application will immediately cease.",
    },
    {
      title: "12. Disclaimers",
      body: 'The Application is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. The Service Provider does not warrant that the Application will be uninterrupted, secure, or error-free.',
    },
    {
      title: "13. Limitation of Liability",
      body: "To the maximum extent permitted by law, the Service Provider shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Application.",
    },
    {
      title: "14. Intellectual Property",
      body: "The Application and its original content, features, and functionality are owned by the Service Provider and are protected by international copyright, trademark, and other intellectual property laws.",
    },
    {
      title: "15. Changes to Terms",
      body: "The Service Provider may update these Terms of Use from time to time. Continued use of the Application after changes constitutes acceptance of the updated terms.",
    },
    {
      title: "16. Governing Law",
      body: "These Terms of Use shall be governed by and construed in accordance with the laws of the Republic of Uzbekistan, without regard to its conflict of law provisions.",
    },
    {
      title: "17. Contact Us",
      body: "If you have any questions about these Terms of Use, please contact the Service Provider at:",
    },
  ],
};

const UZ: TermsOfUseDoc = {
  title: "Foydalanish shartlari",
  updated: "Oxirgi yangilanish: sentabr 2026",
  intro:
    'MySaloon ("biz") MySaloon mobil ilovasi va Morf AI funksiyalarini boshqaradi. Ilovani yuklab, kirish yoki foydalanish orqali siz bu Foydalanish shartlariga rioya qilishga rozilik bildirasiz.',
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "1. Shartlarni qabul qilish",
      body: "Ilovani yuklab, kirish yoki foydalanish orqali siz bu Foydalanish shartlariga rioza qilishga rozilik bildirasiz. Shartlarga rozilik bilmagansiz, ilovani ishlatmang.",
    },
    {
      title: "2. Talablar",
      body: "Ilovadan foydalanish uchun kamida 13 yoshda bo'lishingiz kerak. Ilovadan foydalanish orqali siz kamida 13 yoshda ekanligingizni va bu shartlarni imzolash huquqiga ega ekanligingizni tasdiqlaysiz.",
    },
    {
      title: "3. Foydalanish uchun litsenziya",
      body: "Xizmat ta'minotchisi sizga ilovani shu shartlarga muvofiq shaxsiy, tijorat bo'lmagan maqsadlarda foydalanish uchun cheklangan, eksklyuziv bo'lmagan, o'tkazilmaydigan, bekor qilinadigan litsenziya beradi.",
    },
    {
      title: "4. Foydalanuvchi mas'uliyati",
      body: "Siz ilovani faqat qonuniy maqsadlarda va bu Foydalanish shartlariga muvofiq ishlatishga rozilik bildirasiz. Siz quyidagilarni qilmasligingiz kerak:",
      bullets: [
        "Ilovani qonunga zid yoki ruxsatsiz maqsadlarda ishlatish",
        "Ilova yoki serverlarga xalaqit berish",
        "Ilovaning qismiga ruxsatsiz kirishga urinish",
        "Hisob ma'lumotlarini boshqalar bilan baham ko'rish",
        "Ilovani boshqalarni ta'qib qilish, haqorat qilish yoki zarar yetkazish uchun ishlatish",
      ],
    },
    {
      title: "5. Hisob xavfsizligi",
      body: "Siz hisob ma'lumotlaringizning maxfiyligini saqlash va hisobingiz ostida sodir bo'ladigan barcha faoliyat uchun javobgarsiz. Hisobingizga ruxsatsiz kirish bo'lsa, darhol Xizmat ta'minotchisiga xabar berishga rozilik bildirasiz.",
    },
    {
      title: "6. Kontent va foydalanuvchi ma'lumotlari",
      body: "Siz ilovaga yuborgan kontent mulkiy sizda qoladi. Kontent yuborish orqali siz Xizmat ta'minotchisiga ilova xizmatlarini taqdim etish maqsadida kontentdan foydalanish, ko'paytirish va ko'rsatish uchun dunyo bo'ylab eksklyuziv bo'lmagan, royaltisiz litsenziya berasiz.",
    },
    {
      title: "7. Sun'iy intellekt funksiyalari",
      body: "Ilovada uslub tavsiyalari, yuz tahlili va virtual sinash kabi AI bilan boshqariladigan funksiyalar mavjud. Bu funksiyalardan foydalanish orqali siz quyidagilarni tasdiqlaysiz:",
      bullets: [
        "AI tavsiyalari algoritmlarga asoslangan va har doim aniq bo'lmasligi mumkin",
        "Xizmat ta'minotchisi AI tavsiyalari asosida qabul qilingan qarorlar uchun javobgar emas",
        "Sizning tasvirlaringiz va ma'lumotlaringiz AI aniqligini oshirish uchun qayta ishlanishi mumkin",
      ],
    },
    {
      title: "8. Manzil xizmatlari",
      body: "Ilova yaqin atrofdagi sartaroshlarni topish kabi manzilga asoslangan funksiyalarni taqdim etish uchun qurilmaning manziliga kirishni so'rashi mumkin. Qurilma sozlamalarida manzil xizmatlarini o'chirishingiz mumkin, bu ba'zi ilova funksiyalariga ta'sir qilishi mumkin.",
    },
    {
      title: "9. Bron va to'lovlar",
      body: "Ilova orqali uchrashuvlarni bron qilganda, siz quyidagilarga rozilik bildirasiz:",
      bullets: [
        "Aniq va to'liq ma'lumot berish",
        "Rejalashtirilgan uchrashuvlarga vaqtida kelish",
        "Sartaroshning bekor qilish siyosatiga amal qilish",
        "O'tkazib yuborilgan uchrashuvlar uchun qo'llaniladigan to'lovlarni to'lash",
      ],
    },
    {
      title: "10. Uchinchi tomon xizmatlari",
      body: "Ilova to'lov protsessorlari, xarita xizmatlari va ijtimoiy media platformalari kabi uchinchi tomon xizmatlari bilan integratsiya qilishi mumkin. Bu xizmatlardan foydalanishingiz ularning mos shartlari va maxfiylik siyosatlariga bo'ysunadi.",
    },
    {
      title: "11. Qisqartirish",
      body: "Xizmat ta'minotchisi ilovaga kirishingizni istalgan vaqtda, sababsiz yoki sabab bilan, xabarsiz yoki xabarsiz, qisqartirish yoki to'xtatib qo'yish huquqini saqlab qoladi. Qisqartirilgandan so'ng, ilovadan foydalanish huquqingiz darhol tugaydi.",
    },
    {
      title: "12. Qo'shimcha shartlar",
      body: 'Ilova "hozirgi holatda" va "mavjud holatda" asosida, hech qanday kafolatlar bilan ta\'minlanmaydi, bunga ochiq yoki bilvosita kafolatlar kiradi. Xizmat ta\'minotchisi ilovaning uzluksiz, xavfsiz yoki xatosiz bo\'lishini kafolatlamaydi.',
    },
    {
      title: "13. Javobgarlik cheklovi",
      body: "Qonunga ruxsat berilgan darajada, Xizmat ta'minotchisi ilovadan foydalanishingiz natijasida kelib chiqadigan bilvosita, tasodifiy, maxsus, oqibatli yoki jazoviy zararlar uchun javobgar bo'lmaydi.",
    },
    {
      title: "14. Intellektual mulk",
      body: "Ilova va uning asl kontenti, funksiyalari va imkoniyatlari Xizmat ta'minotchisiga tegishli va xalqaro mualliflik huquqi, savdo belgisi va boshqa intellektual mulk qonunlari bilan himoyalangan.",
    },
    {
      title: "15. Shartlarning o'zgarishi",
      body: "Xizmat ta'minotchisi bu Foydalanish shartlarini vaqti-vaqti bilan yangilashi mumkin. O'zgarishlardan keyin ilovadan davom etgan foydalanish yangilangan shartlarni qabul qilish hisoblanadi.",
    },
    {
      title: "16. Qo'llaniladigan qonun",
      body: "Bu Foydalanish shartlari O'zbekiston Respublikasi qonunlariga, shu jumladan uning qonunlar to'qnashuvi qoidalariga e'tibor bermagan holda, boshqariladi va talqin etiladi.",
    },
    {
      title: "17. Biz bilan bog'lanish",
      body: "Bu Foydalanish shartlari bo'yicha savollaringiz bo'lsa, Xizmat ta'minotchisiga quyidagi manzil orqali murojaat qiling:",
    },
  ],
};

const RU: TermsOfUseDoc = {
  title: "Условия использования",
  updated: "Последнее обновление: сентябрь 2026",
  intro:
    "MySaloon («мы») управляет мобильным приложением MySaloon и функциями Morf AI. Загружая, открывая или используя Приложение, вы соглашаетесь соблюдать эти Условия использования.",
  contactEmail: CONTACT_EMAIL,
  sections: [
    {
      title: "1. Принятие условий",
      body: "Загружая, открывая или используя Приложение, вы соглашаетесь соблюдать эти Условия использования. Если вы не согласны с этими условиями, вы не должны использовать Приложение.",
    },
    {
      title: "2. Требования",
      body: "Для использования Приложения вам должно быть не менее 13 лет. Используя Приложение, вы подтверждаете и гарантируете, что вам не менее 13 лет и вы имеете юридическую способность принять эти условия.",
    },
    {
      title: "3. Лицензия на использование",
      body: "Поставщик услуг предоставляет вам ограниченную, неисключительную, непередаваемую, отзываемую лицензию на использование Приложения в личных некоммерческих целях в соответствии с этими условиями.",
    },
    {
      title: "4. Обязанности пользователя",
      body: "Вы соглашаетесь использовать Приложение только в законных целях и в соответствии с этими Условиями использования. Вы не должны:",
      bullets: [
        "Использовать Приложение для незаконных или несанкционированных целей",
        "Вмешиваться в работу Приложения или серверов",
        "Пытаться получить несанкционированный доступ к любой части Приложения",
        "Делиться учетными данными с другими",
        "Использовать Приложение для преследования, оскорбления или причинения вреда другим",
      ],
    },
    {
      title: "5. Безопасность аккаунта",
      body: "Вы несете ответственность за сохранение конфиденциальности информации вашего аккаунта и за все действия, происходящие под вашим аккаунтом. Вы соглашаетесь немедленно уведомить Поставщика услуг о любом несанкционированном использовании вашего аккаунта.",
    },
    {
      title: "6. Контент и данные пользователя",
      body: "Вы сохраняете право собственности на любой контент, который вы отправляете в Приложение. Отправляя контент, вы предоставляете Поставщику услуг всемирную, неисключительную, безroyalty-лицензию на использование, воспроизведение и отображение контента исключительно для предоставления услуг Приложения.",
    },
    {
      title: "7. Функции искусственного интеллекта",
      body: "Приложение включает функции на базе ИИ, такие как рекомендации стиля, анализ лица и виртуальная примерка. Используя эти функции, вы признаете, что:",
      bullets: [
        "Рекомендации ИИ основаны на алгоритмах и могут не всегда быть точными",
        "Поставщик услуг не несет ответственности за решения, принятые на основе рекомендаций ИИ",
        "Ваши изображения и данные могут обрабатываться для повышения точности ИИ",
      ],
    },
    {
      title: "8. Службы определения местоположения",
      body: "Приложение может запросить доступ к местоположению вашего устройства для предоставления функций на основе местоположения, таких как поиск ближайших барбершопов. Вы можете отключить службы определения местоположения в настройках устройства, что может повлиять на некоторые функции Приложения.",
    },
    {
      title: "9. Бронирование и платежи",
      body: "Бронируя встречи через Приложение, вы соглашаетесь:",
      bullets: [
        "Предоставлять точную и полную информацию",
        "Приходить вовремя на запланированные встречи",
        "Соблюдать политику отмены барбершопа",
        "Оплачивать применимые сборы за пропущенные встречи",
      ],
    },
    {
      title: "10. Сторонние сервисы",
      body: "Приложение может интегрироваться со сторонними сервисами, такими как процессоры платежей, картографические сервисы и социальные платформы. Ваше использование этих сервисов регулируется их соответствующими условиями и политиками конфиденциальности.",
    },
    {
      title: "11. Прекращение",
      body: "Поставщик услуг оставляет за собой право приостановить или прекратить ваш доступ к Приложению в любое время, с или без причины, с уведомлением или без него. При прекращении ваше право использовать Приложение немедленно прекращается.",
    },
    {
      title: "12. Отказ от ответственности",
      body: "Приложение предоставляется на условиях «как есть» и «как доступно» без каких-либо гарантий, явных или подразумеваемых. Поставщик услуг не гарантирует, что Приложение будет работать без перебоев, безопасно или без ошибок.",
    },
    {
      title: "13. Ограничение ответственности",
      body: "В максимальной степени, разрешенной законом, Поставщик услуг не несет ответственности за любые косвенные, случайные, специальные, косвенные или штрафные убытки, возникшие в результате использования вами Приложения.",
    },
    {
      title: "14. Интеллектуальная собственность",
      body: "Приложение и его оригинальный контент, функции и возможности принадлежат Поставщику услуг и защищены международными законами об авторском праве, товарных знаках и другой интеллектуальной собственностью.",
    },
    {
      title: "15. Изменения условий",
      body: "Поставщик услуг может время от времени обновлять эти Условия использования. Продолжение использования Приложения после изменений означает принятие обновленных условий.",
    },
    {
      title: "16. Применимое право",
      body: "Эти Условия использования регулируются и толкуются в соответствии с законами Республики Узбекистан, без учета положений о коллизионном праве.",
    },
    {
      title: "17. Связаться с нами",
      body: "Если у вас есть вопросы об этих Условиях использования, пожалуйста, свяжитесь с Поставщиком услуг по:",
    },
  ],
};

export function getTermsOfUse(lang: string | undefined): TermsOfUseDoc {
  const code = (lang ?? "uz").toLowerCase();
  if (code.startsWith("en")) return EN;
  if (code.startsWith("ru")) return RU;
  return UZ;
}
