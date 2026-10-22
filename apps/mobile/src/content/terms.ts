export type TermsSection = {
  title: string;
  body?: string;
  bullets?: string[];
  link?: string;
};

export type TermsDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: TermsSection[];
  contactEmail: string;
  externalLink?: string;
};

const CONTACT_EMAIL = "help@mysaloon.uz";
const EXTERNAL_LINK = "https://api.mysaloon.uz/terms-of-use/";

const EN: TermsDoc = {
  title: "Terms & Conditions",
  updated: "These terms and conditions are effective as of 2026-10-22",
  intro:
    "These terms and conditions apply to the Mysaloon app for mobile devices and web browsers, together with any related services operated by Abdurahim Oripov (collectively, the \"Application\"). Abdurahim Oripov is hereby referred to as the \"Service Provider\". By downloading or using the Application, you agree to these Terms and Conditions. You should read them carefully before using the Application.",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "License to use the Application",
      body: "Subject to your compliance with these Terms, the Service Provider grants you a limited, non-exclusive, non-transferable, revocable license to install and use the Application on a mobile device or computer for personal or internal business purposes. You may not reproduce, distribute, modify, create derivative works from, reverse engineer, decompile, or disassemble the Application, except as and only to the extent that such activity is expressly permitted by applicable law.",
    },
    {
      title: "Intellectual Property",
      body: "The Service Provider retains all intellectual property rights in the Application, including its code, design, trademarks, service marks, trade names, logos, and branding (the \"IP\"). Nothing in these Terms grants you any license or right to use the Service Provider's trademarks, logos, or branding for any purpose. You agree not to remove, alter, or obscure any copyright, trademark, or other proprietary notices displayed in or on the Application.",
    },
    {
      title: "Termination",
      body: "The Service Provider may suspend your access to the Application or services if you materially breach these Terms. The Service Provider will provide you with written notice of the breach and, where the breach is capable of cure, you will have 14 days from receipt of notice to remedy the breach. If you fail to cure the breach within that period, the Service Provider may terminate your access. The Service Provider may suspend or terminate your access immediately without notice if you violate applicable law, infringe intellectual property rights, or engage in activity that could cause harm to other users or the Service Provider. Upon termination, your right to use the Application will end and you must delete all copies from your devices.",
    },
    {
      title: "Age and Legal Compliance",
      body: "By accessing and using this Application, you represent that you are legally permitted to use it in your jurisdiction. You must be at least 13 years of age (the age of digital consent in your jurisdiction) to use the Application. If you are below 13, a parent or legal guardian must review and accept these Terms on your behalf. Unauthorized copying, modification of the Application, any part of the Application, or the Service Provider's trademarks is strictly prohibited. Any attempts to extract the source code of the Application, translate the Application into other languages, or create derivative versions are not permitted. All trademarks, copyrights, database rights, and other intellectual property rights related to the Application remain the property of the Service Provider.",
    },
    {
      title: "User-Generated Content and Acceptable Use",
      body: "If this Application allows users to post, share, or upload content, you agree not to post content that:",
      bullets: [
        "Is illegal or violates third-party intellectual property rights (copyright, trademark, patents)",
        "Is abusive, threatening, harassing, defamatory, or hate speech",
        "Contains discrimination or incitement to violence or illegal activity",
        "Is spam, phishing, or contains malware",
        "Violates the privacy or personal data rights of others",
        "Is misleading, false, or deceptive",
        "Contains explicit violence or sexual content (unless age-gated appropriately)",
      ],
    },
    {
      title: "Content Moderation",
      body: "The Service Provider reserves the right to remove or disable access to content that violates these guidelines, suspend or terminate accounts of users who repeatedly violate these guidelines, cooperate with law enforcement if illegal content is reported, and moderate, filter, or hide content that violates these Terms, applicable law, or the guidelines set out above. Content submitted through the Application may be visible to other users or to the public, depending on how the Application functions.",
    },
    {
      title: "Reporting Content",
      body: "If you believe content violates these Terms, infringes your rights, or is unlawful, you may report it to the Service Provider at help@mysaloon.uz. The report should include enough information for the Service Provider to identify the content, evaluate the complaint, and contact you if follow-up is required. Where the Application provides such features, you may also report content, block other users, or mute notifications directly through the Application's interface. The Service Provider will review in-app reports with the same standards described in these Terms.",
    },
    {
      title: "Content License",
      body: "By submitting User-Generated Content you grant the Service Provider a non-exclusive, worldwide, royalty-free license to use, reproduce, distribute, prepare derivative works of, display and perform the content in connection with the Application and the Service Provider's business. This license does not grant the Service Provider the right to sell or sublicense your content to third parties independently of the Application. You represent and warrant that you own or control all rights in the content you post and that use of the content does not violate these Terms or applicable law. Your content may include personal data. Processing of personal data related to User-Generated Content is governed by the Privacy Policy. Do not post personal data of others without their consent.",
    },
    {
      title: "Pricing and Device Security",
      body: "The Service Provider is dedicated to ensuring that the Application is as beneficial and efficient as possible. As such, they reserve the right to modify the Application or charge for their services at any time and for any reason. The Service Provider assures you that any charges for the Application or its services will be clearly communicated to you. The Application stores and processes personal data that you have provided to the Service Provider in order to provide the Service. It is your responsibility to maintain the security of your mobile device or computer and access to the Application. The Service Provider strongly advises against jailbreaking or rooting your mobile device or computer, which involves removing software restrictions and limitations imposed by the official operating system of your mobile device or computer. Such actions could expose your mobile device or computer to malware, viruses, malicious programs, compromise your mobile device or computer's security features, and may result in the Application not functioning correctly or at all.",
    },
    {
      title: "Third Party Services",
      body: "Please be aware that the Service Provider does not assume responsibility for certain aspects. Some functions of the Application require an active internet connection, which can be Wi-Fi or provided by your mobile network provider. The Service Provider cannot be held responsible if the Application does not function at full capacity due to lack of access to Wi-Fi or if you have exhausted your data allowance. If you are using the application outside of a Wi-Fi area, please be aware that your mobile network provider's agreement terms still apply. Consequently, you may incur charges from your mobile provider for data usage during the connection to the application, or other third-party charges. By using the application, you accept responsibility for any such charges, including roaming data charges if you use the application outside of your home territory (i.e., region or country) without disabling data roaming. If you are not the bill payer for the device on which you are using the application, they assume that you have obtained permission from the bill payer.",
    },
    {
      title: "Internet Connection and Data Charges",
      body: "Please be aware that the Service Provider does not assume responsibility for certain aspects. Some functions of the Application require an active internet connection. The Service Provider cannot be held responsible if the Application does not function at full capacity due to lack of access to the internet or if you have exhausted your data allowance. If you are using the Application, please be aware that your internet service provider's agreement terms still apply. Consequently, you may incur charges from your internet provider for data usage during the use of the Application. By using the Application, you accept responsibility for any such charges. Similarly, the Service Provider cannot always assume responsibility for your usage of the application. For instance, it is your responsibility to ensure that your device remains charged. If your device runs out of battery and you are unable to access the Service, the Service Provider cannot be held responsible.",
    },
    {
      title: "Consumer Protection",
      body: "Nothing in these Terms shall limit any rights you have under applicable consumer protection laws that cannot be lawfully excluded.",
    },
    {
      title: "Limitation of Liability",
      body: "To the fullest extent permitted by law, the Service Provider shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to lost profits, data loss, or business interruption, even if advised of the possibility of such damages. However, the Service Provider retains full liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, and any other liability that cannot be excluded or limited under applicable law. To the fullest extent permitted by law, the total liability of the Service Provider for any claim shall not exceed the amount paid by you to the Service Provider for the Application in the 12 months preceding the claim, or the minimum amount that must be paid under applicable law, whichever is greater. If the Application is provided free of charge, this means the Service Provider's liability is limited to the minimum amount permitted by applicable law. The Service Provider accepts no liability for any loss, direct or indirect, that you experience as a result of relying entirely on third-party information provided through this Application, or for inaccuracies in content provided by third parties.",
    },
    {
      title: "Indemnification",
      body: "To the fullest extent permitted by law, you agree to indemnify and hold harmless the Service Provider, its affiliates, officers, directors, employees and agents from and against any claims, liabilities, damages, losses and expenses, including reasonable legal fees, arising out of or directly related to your breach of these Terms or your intentional misuse of the Application, including User-Generated Content you submit in violation of these Terms. This indemnification does not apply to claims arising from the Service Provider's own negligence, breach of these Terms, or violation of applicable law. In jurisdictions where consumer indemnification is restricted by law, this clause shall be limited to the maximum extent permitted.",
    },
    {
      title: "Artificial Intelligence",
      body: "The Application incorporates Artificial Intelligence (AI) technologies to provide certain features or services. By using the Application, you acknowledge and agree that AI may be used to process data and deliver functionalities. The Service Provider ensures that all AI usage complies with applicable laws and is designed to benefit the user experience.",
    },
    {
      title: "Updates and Termination",
      body: "The Service Provider may wish to update the application at some point. The application is currently available as per the requirements for the operating system (and for any additional systems they decide to extend the availability of the application to) may change, and you will need to download the updates if you want to continue using the application. The Service Provider does not guarantee that it will always update the application so that it is relevant to you and/or compatible with the particular operating system version installed on your device. You should accept updates when offered; if you choose not to, the Service Provider may cease to support earlier versions and the Application may not function properly. The Service Provider may also wish to cease providing the application and may terminate its use at any time without providing termination notice to you. Unless they inform you otherwise, upon any termination, (a) the rights and licenses granted to you in these terms will end; (b) you must cease using the application, and (if necessary) delete it from your device.",
    },
    {
      title: "Governing Law and Jurisdiction",
      body: "These Terms and Conditions are governed by the laws of the jurisdiction in which the Service Provider is established, excluding conflict of law rules, except to the extent mandatory consumer protection laws provide otherwise. Any dispute arising out of or relating to these Terms will be brought before the courts that have jurisdiction under applicable law. Nothing in this clause limits any rights you may have to bring a claim in a court that is competent under mandatory law.",
    },
    {
      title: "DSA Compliance (Digital Services Act)",
      body: "If the Application is an intermediary service as defined under the Digital Services Act (Regulation (EU) 2022/2065, \"DSA\"), the following provisions apply in addition to the terms above.",
      bullets: [
        "Point of Contact: The Service Provider maintains a single point of contact for direct communication with EU authorities and recipients of the service, reachable at help@mysaloon.uz. Where the Service Provider is established outside the European Union, a legal representative in the EU has been designated in accordance with Article 13 of the DSA.",
        "Content Moderation and Statement of Reasons: When the Service Provider restricts access to content, suspends or terminates an account, or otherwise limits the availability of the Application's features, a clear and specific statement of reasons will be provided to the affected user. The statement will include the nature of the restriction, the legal or contractual basis for the decision, and information on available redress mechanisms, in accordance with Article 17 of the DSA.",
        "Notice and Action: Users and third parties may submit notices of allegedly illegal content through the contact details provided in these Terms. The Service Provider will process notices promptly, diligently, and without automated decision-making where the circumstances require human review. Notices will be acknowledged electronically and a decision communicated without undue delay, in accordance with Article 16 of the DSA.",
        "Out-of-Court Dispute Settlement: Disputes regarding content moderation decisions, including decisions to restrict content or suspend accounts, may be submitted to an out-of-court dispute settlement body certified in accordance with Article 21 of the DSA. The Service Provider will engage with such bodies in good faith. Use of out-of-court dispute settlement does not affect your right to seek judicial remedy under applicable law.",
        "Transparency Reporting: The Service Provider publishes periodic transparency reports covering content moderation activities, including the volume of notices received, actions taken, and automated means used, in accordance with Article 24 of the DSA. Reports are made available upon request at help@mysaloon.uz.",
      ],
    },
    {
      title: "Severability",
      body: "If any provision of these Terms and Conditions is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, and the remaining provisions of these Terms shall remain in full force and effect.",
    },
    {
      title: "Entire Agreement",
      body: "These Terms and Conditions, together with the Privacy Policy, constitute the entire agreement between you and the Service Provider concerning your use of the Application, superseding any prior agreements or understandings.",
    },
    {
      title: "Changes to These Terms and Conditions",
      body: "The Service Provider may periodically update their Terms and Conditions. Therefore, you are advised to review this page regularly for any changes. The Service Provider will notify you of any changes by posting the new Terms and Conditions on this page. Previous versions of these Terms and Conditions will be maintained and made available upon request by contacting the Service Provider at help@mysaloon.uz.",
    },
    {
      title: "Contact Us",
      body: "If you have any questions or suggestions about the Terms and Conditions, please do not hesitate to contact the Service Provider at help@mysaloon.uz.",
    },
    {
      title: "Terms & Conditions Generator",
      body: "This Terms & Conditions page was generated by [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/)",
    },
  ],
};

const UZ: TermsDoc = {
  title: "Foydalanish shartlari",
  updated: "Ushbu foydalanish shartlari 2026-10-22 yildan boshlab kuchga kiradi",
  intro:
    "Ushbu foydalanish shartlari mobil qurilmalar va veb-brauzerlar uchun Mysaloon ilovasiga, shuningdek Abdurahim Oripov tomonidan boshqariladigan bog'liq xizmatlarga (umumiy holda, \"Ilova\") taalluqli. Abdurahim Oripov ushbu hujjatda \"Xizmat ko'rsatuvchi\" sifatida ataladi. Ilovani yuklab olish yoki ishlatish orqali siz ushbu Foydalanish shartlariga rozilik bildirasiz. Ilovadan foydalanishdan oldin ularni ehtiyat bilan o'qishingiz kerak.",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "Ilovadan foydalanish litsenziyasi",
      body: "Ushbu Shartlarga rioza qilishingiz sharti bilan, Xizmat ko'rsatuvchi sizga mobil qurilma yoki kompyuteringizda shaxsiy yoki ichki biznes maqsadlarida Ilovani o'rnatish va foydalanish uchun cheklangan, eksklyuziv bo'lmagan, o'tkazilmaydigan, bekor qilinishi mumkin bo'lgan litsenziyani beradi. Siz qonunda bunday faoliyatga aniq ruxsat berilgan darajada bo'lmasa, Ilovani ko'chirish, tarqatish, o'zgartirish, hosil qilingan asarlar yaratish, teskari muhandislik qilish, dekompilyatsiya qilish yoki disassembly qilish huquqiga egasiz.",
    },
    {
      title: "Intellektual mulk",
      body: "Xizmat ko'rsatuvchi Ilovadagi barcha intellektual mulk huquqlarini, jumladan kodini, dizaynini, savdo belgilarini, xizmat belgilarini, savdo nomlarini, logolarini va brendingini (\"IP\") saqlab qoladi. Ushbu Shartlarda Xizmat ko'rsatuvchining savdo belgalarini, logolarini yoki brendingini har qanday maqsadda ishlatish uchun litsenziya yoki huquq bermaydi. Siz Ilovada yoki uning ustida ko'rsatilgan mualliflik huquqi, savdo belgasi yoki boshqa egalik bildirishlarini olib tashlamaslik, o'zgartirmaslik yoki yashirmaslikga rozilik bildirasiz.",
    },
    {
      title: "Tugatish",
      body: "Agar siz ushbu Shartlarni jiddiy buzgan bo'lsangiz, Xizmat ko'rsatuvchi Ilovaga yoki xizmatlarga kirishingizni to'xtatishi mumkin. Xizmat ko'rsatuvchi sizga buzilish haqida yozma xabar beradi va buzilish tuzatilishi mumkin bo'lsa, xabarni olgandan so'ng 14 kun ichida buzilishni tuzatishingiz kerak. Agar shu muddat ichida buzilishni tuzatmasangiz, Xizmat ko'rsatuvchi kirishingizni tugatishi mumkin. Xizmat ko'rsatuvchi qonunni buzganingizda, intellektual mulk huquqlarini buzganingizda yoki boshqa foydalanuvchilar yoki Xizmat ko'rsatuvchiga zarar yetkazishi mumkin bo'lgan faoliyatda qatnashganingizda kirishingizni xabarsiz to'xtatishi yoki tugatishi mumkin. Tugatilgandan so'ng, Ilovadan foydalanish huquqingiz tugaydi va qurilmalaringizdan barcha nusxalarni o'chirishingiz kerak.",
    },
    {
      title: "Yosh va qonuniy moslik",
      body: "Ushbu Ilovaga kirish va undan foydalanish orqali siz yurisdikangizda qonuniy ravishda foydalanishga ruxsat ekanligini bildirasiz. Ilovadan foydalanish uchun kamida 13 yoshda (yurisdikangizdagi raqamli rozilik yoshi) bo'lishingiz kerak. Agar siz 13 yoshdan kichik bo'lsangiz, ota-ona yoki qonuniy vasiy ushbu Shartlarni siz nomingizdan ko'rib va qabul qilishi kerak. Ilovaning noqonuniy nusxalash, o'zgartirish, uning qismi yoki Xizmat ko'rsatuvchining savdo belgalariga qarshi har qanday urinish qat'iyan man etilgan. Ilova manba kodini olish, uni boshqa tillarga tarjima qilish yoki hosil qilingan versiyalarni yaratishga ruxsat berilmaydi. Ilovaga bog'liq barcha savdo belgalari, mualliflik huquqlari, ma'lumotlar bazasi huquqlari va boshqa intellektual mulk huquqlari Xizmat ko'rsatuvchining mulki bo'lib qoladi.",
    },
    {
      title: "Foydalanuvchi tomonidan yaratilgan kontent va qabul qilinadigan foydalanish",
      body: "Agar bu Ilova foydalanuvchilarga kontent joylashtirish, baham ko'rish yoki yuklash imkonini bersa, quyidagi kontentlarni joylashtirmaslikka rozilik bildirasiz:",
      bullets: [
        "Noqonuniy yoki uchinchi tomon intellektual mulk huquqlarini (mualliflik huquqi, savdo belgasi, patentlarni) buzuvchi",
        "Zo'ravonlik, tahdid, bezovta qilish, qoralash yoki nafrat nutqi",
        "Kamsitirish yoki zo'ravonlik yoki noqonuniy faoliyatga da'vat qiladi",
        "Spam, phishing yoki zararli dastur o'z ichiga oladi",
        "Boshqalar maxfiyligi yoki shaxsiy ma'lumotlar huquqlarini buzadi",
        "Adashuvchi, yolg'on yoki aldovchi",
        "Shu tarzda qoralash yoki jinsiy kontent (agar mos ravishda yosh cheklovi qo'yilmagan bo'lsa)",
      ],
    },
    {
      title: "Kontent moderatsiyasi",
      body: "Xizmat ko'rsatuvchi ushbu ko'rsatmalarni buzgan kontentni olib tashlash yoki kirishni cheklash, ko'rsatmalarni buzadigan foydalanuvchilarning hisoblarini to'xtatish yoki tugatish, noqonuniy kontent haqida xabar berilsa, qonunni muhofaza qilish organlari bilan hamkorlik qilish va Shartlarni, qo'llanadigan qonun yoki yuqorida belgilangan ko'rsatmalarga zid kontentni moderatsiya qilish, filtrlash yoki yashirish huquqini saqlab qoladi. Ilova orqali yuborilgan kontent boshqa foydalanuvchilar yoki ommaga ko'rinishi mumkin, bu Ilova qanday ishlashiga bog'liq.",
    },
    {
      title: "Kontentni xabar qilish",
      body: "Agar kontent ushbu Shartlarni buzadi, huquqlaringizni buzadi yoki noqonuniy deb hisoblasangiz, uni Xizmat ko'rsatuvchiga help@mysaloon.uz manzili orqali xabar qilishingiz mumkin. Xabar Xizmat ko'rsatuvchiga kontentni aniqlash, shikoyatni baholash va zarur bo'lsa siz bilan bog'lanish uchun etarli ma'lumotlarni o'z ichiga olishi kerak. Ilova bunday imkoniyatlarni taqdim etsa, kontentni xabar qilish, boshqa foydalanuvchilarni bloklash yoki bildirishnomalarni o'chirishni to'g'ridan-to'g'ri Ilova interfeysi orqali ham qilishingiz mumkin. Xizmat ko'rsatuvchi ilova ichidagi xabalarni ushbu Shartlarda tasvirlangan standartlar bilan ko'rib chiqadi.",
    },
    {
      title: "Kontent litsenziyasi",
      body: "Foydalanuvchi tomonidan yaratilgan kontentni yuborish orqali siz Xizmat ko'rsatuvchiga Ilova va Xizmat ko'rsatuvchining biznesi bilan bog'liq holda kontentdan foydalanish, ko'chirish, tarqatish, hosil qilingan asarlar tayyorlash, ko'rsatish va ijro etish uchun eksklyuziv bo'lmagan, butun dunyo bo'ylab, royaltisiz litsenziyani berasiz. Ushbu litsenziya Xizmat ko'rsatuvchiga kontentni Ilovadan mustaqil ravishda uchinchi tomonlarga sotish yoki sublitsenziyalash huquqini bermaydi. Siz joylashtirgan kontentdagi barcha huquqlarga ega yoki ularni nazorat qilishingizni va kontentdan foydalanish ushbu Shartlarni yoki qo'llanadigan qonunni buzmasligini bildirasiz va kafolatlaysiz. Kontentingiz shaxsiy ma'lumotlarni o'z ichiga olishi mumkin. Foydalanuvchi tomonidan yaratilgan kontentga bog'liq shaxsiy ma'lumotlarni qayta ishlash Maxfiylik siyosati bilan boshqariladi. Boshqalar roziligisiz ularning shaxsiy ma'lumotlarini joylashtirmang.",
    },
    {
      title: "Narxlash va qurilma xavfsizligi",
      body: "Xizmat ko'rsatuvchi Ilova imkon qadar foydali va samarali bo'lishiga intiladi. Shunday qilib, ular Ilovani o'zgartirish yoki xizmatlari uchun har qanday vaqtda va har qanday sababga ko'ra to'lov olish huquqini saqlab qoladi. Xizmat ko'rsatuvchi Ilova yoki uning xizmatlari uchun har qanday to'lovni sizga aniq bildirishiga kafolat beradi. Ilova Xizmatni taqdim etish uchun Xizmat ko'rsatuvchiga bergan shaxsiy ma'lumotlarni saqlaydi va qayta ishlaydi. Mobil qurilma yoki kompyuteringiz xavfsizligini va Ilovaga kirishni saqlash sizning mas'uliyatishingizdir. Xizmat ko'rsatuvchi mobil qurilma yoki kompyuteringizni jailbreaking yoki rooting qilishga qat'iy qarshi tavsiya beradi, bu mobil qurilma yoki kompyuteringiz rasmiy operatsion tizimi tomonidan qo'yilgan dasturiy cheklovlar va cheklovlarni olib tashlashni o'z ichiga oladi. Bunday harakatlar mobil qurilma yoki kompyuteringizni zararli dasturlarga, viruslarga, xarakterli dasturlarga, mobil qurilma yoki kompyuteringiz xavfsizlik xususiyatlariga zarar yetkazishi va Ilova to'g'ri ishlamasligiga yoki umuman ishlamasligiga olib kelishi mumkin.",
    },
    {
      title: "Uchinchi tomon xizmatlari",
      body: "E'tibor bering, Xizmat ko'rsatuvchi ba'zi jihatlarga javobgarlikni o'z zimmasiga olmaydi. Ilovaning ba'zi funksiyalari faol internet aloqasini talab qiladi, bu Wi-Fi yoki mobil tarmoq provayderingiz tomonidan taqdim etilishi mumkin. Wi-Fi ga kirish yo'q yoki ma'lumotlaringiz tugagan bo'lsa, Ilova to'liq quvvatda ishlamasligi uchun Xizmat ko'rsatuvchi javobgar bo'lmaydi. Ilovani Wi-Fi hududidan tashqarida ishlatganingizda, mobil tarmoq provayderingizning shartnomasi shartlari hali qo'llanadi. Natijada, ilovaga ulanish davomida ma'lumot foydalanishi uchun mobil provayderingizdan to'lovlar yoki boshqa uchinchi tomon to'lovlarni to'lashingiz mumkin. Ilovadan foydalanish orqali, ma'lumotni ishlatishda roaming ma'lumot to'lovlari kabi bunday to'lovlarga javobgarlikni qabul qilasiz. Ilovadan foydalanayotgan qurilma uchun to'lov to'lovchi bo'lmasangiz, ular to'lov to'lovchidan ruxsat olganingizni taxmin qiladi.",
    },
    {
      title: "Internet ulanishi va ma'lumot to'lovlari",
      body: "E'tibor bering, Xizmat ko'rsatuvchi ba'zi jihatlarga javobgarlikni o'z zimmasiga olmaydi. Ilovaning ba'zi funksiyalari faol internet aloqasini talab qiladi. Internetga kirish yo'q yoki ma'lumotlaringiz tugagan bo'lsa, Ilova to'liq quvvatda ishlamasligi uchun Xizmat ko'rsatuvchi javobgar bo'lmaydi. Ilovadan foydalanayotganda, internet xizmat provayderingizning shartnomasi shartlari hali qo'llanadi. Natijada, Ilovadan foydalanish davomida ma'lumot foydalanishi uchun internet provayderingizdan to'lovlarni to'lashingiz mumkin. Ilovadan foydalanish orqali, bunday to'lovlarga javobgarlikni qabul qilasiz. Xuddi shunday, Xizmat ko'rsatuvchi har doim ilovadan foydalanishingizga javobgarlikni o'z zimmasiga olmaydi. Masalan, qurilmangiz zaryadlanganligini ta'minlash sizning mas'uliyatishingizdir. Agar qurilmangizning batareyasi tugasa va Xizmatga kirish olmasangiz, Xizmat ko'rsatuvchi javobgar bo'lmaydi.",
    },
    {
      title: "Iste'molchi himoyasi",
      body: "Ushbu Shartlarda hech qanday qonuniy ravishda chetlashtirib bo'lmaydigan qo'llanadigan iste'molchi himoyasi qonunlari ostidagi huquqlaringizni cheklash mumkin emas.",
    },
    {
      title: "Javobgarlikni cheklash",
      body: "Qonun ruxsat beradigan darajada, Xizmat ko'rsatuvchi to'g'ridan-to'g'ri bo'lmagan, tasodifiy, maxsus, oqibatli yoki jazoni shu jumladan foyda yo'qotish, ma'lumot yo'qotishi yoki biznes uzilishi kabi zararlarga javobgar bo'lmaydi, bunday zararlar ehtimoli haqida ogohlantirilgan bo'lsa ham. Biroq, Xizmat ko'rsatuvchi e'tiyotsizlik oqibasida o'lim yoki shaxsiy jarohat, firibgarlik yoki firibgarlik yolg'on tasdiqlash va qo'llanadigan qonun ostida chetlashtirilishi yoki cheklanishi mumkin bo'lgan boshqa barcha javobgarliklarni to'liq saqlab qoladi. Qonun ruxsat beradigan darajada, Xizmat ko'rsatuvchining har qanday da'vo uchun umumiy javobgarligi talabdan oldingi 12 oy ichida siz Xizmat ko'rsatuvchiga to'lagan miqdor yoki qo'llanadigan qonunda talab qilinadigan minimal miqdordan ko'p bo'lmaydi. Agar Ilova bepul taqdim etilsa, bu Xizmat ko'rsatuvchining javobgarligi qo'llanadigan qonunda ruxsat etilgan minimal miqdorga cheklangan degani. Xizmat ko'rsatuvchi bu Ilova orqali taqdim etilgan uchinchi tomon ma'lumotlariga to'liq tayanish natijasida tajrib qilgan to'g'ridan-to'g'ri yoki bilvosita yo'qotish yoki uchinchi tomonlar tomonidan taqdim etilgan kontentdagi noaniqliklar uchun javobgarlikni o'z zimmasiga olmaydi.",
    },
    {
      title: "Indemnifikatsiya",
      body: "Qonun ruxsat beradigan darajada, siz ushbu Shartlarni buzishingiz yoki Ilovani qasddan noto'g'ri ishlatishingiz, jumladan ushbu Shartlarni buzgan holda yuborgan Foydalanuvchi tomonidan yaratilgan kontent tufayli kelib chiqadigan barcha da'volar, javobgarliklar, zararlar, yo'qotishlar va xarajatlar, jumladan oqilona huquqiy to'lovlarni Xizmat ko'rsatuvchiga, uning filiallariga, xodimlariga, direktorlariga va agentlariga to'ldirish va himoya qilishga rozilik bildirasiz. Ushbu indemnifikatsiya Xizmat ko'rsatuvchining o'z e'tiyotsizligi, ushbu Shartlarni buzishi yoki qo'llanadigan qonunni buzishidan kelib chiqadigan da'volarga taalluqli emas. Foydalanuvchi indemnifikatsiyasi qonun bilan cheklangan yurisdiklarda bu band qonun ruxsat beradigan maksimal darajada cheklanadi.",
    },
    {
      title: "Sun'iy intellekt",
      body: "Ilova ma'lum funksiyalarni yoki xizmatlarni taqdim etish uchun Sun'iy Intellekt (AI) texnologiyalarini o'z ichiga oladi. Ilovadan foydalanish orqali siz AI ma'lumotlarni qayta ishlashi va funksiyalarni yetkazib berishi mumkinligini tan olasiz va rozilik bildirasiz. Xizmat ko'rsatuvchi barcha AI foydalanishi qo'llanadigan qonunga mos keladi va foydalanuvchi tajribasiga foyda keltirish uchun mo'ljallanganligini ta'minlaydi.",
    },
    {
      title: "Yangilanishlar va tugatish",
      body: "Xizmat ko'rsatuvchi vaqti-vaqti bilan ilovani yangilashni xohlashi mumkin. Ilova hozir operatsion tizim talablariga (va ular ilova mavjudligini kengaytirishni hal qiladigan qo'shimcha tizimlar uchun) mos ravishda mavjud va agar ilovani davom etishni xohlasangiz, yangilanishlarni yuklab olishingiz kerak. Xizmat ko'rsatuvchi ilovani har doim siz uchun dolzarli va/qurilmangizda o'rnatilgan operatsion tizim versiyasi bilan mos bo'lishini kafolatlamaydi. Taklif qilinganda yangilanishlarni qabul qilishingiz kerak; qabul qilmasangiz, Xizmat ko'rsatuvchi oldingi versiyalarni qo'llab-quvvatlashni to'xtatishi mumkin va Ilova to'g'ri ishlamasligi mumkin. Xizmat ko'rsatuvchi ilovani taqdim etishni to'xtatishni ham xohlashi mumkin va xabarsiz istalgan vaqtda foydalanishni tugatishi mumkin. Boshqacha aytmasa, tugatilganda, (a) ushbu shartlarda sizga berilgan huquq va litsenziyalar tugaydi; (b) ilovadan foydalanishni to'xtatishingiz va (zarur bo'lsa) qurilmangizdan o'chirishingiz kerak.",
    },
    {
      title: "Qo'llanadigan qonun va yurisdiksiya",
      body: "Ushbu Foydalanish shartlari majburiy iste'molchi himoyasi qonunlari boshqacha ta'minlash darajasida bo'lmaganda, mojaro qonunlarini istisno qilib, Xizmat ko'rsatuvchi tashkil etilgan yurisdiksiya qonunlari bilan boshqariladi. Ushbu Shartlarga bog'liq yoki ular bilan aloqador har qanday nizo qo'llanadigan qonun bo'yicha yurisdiksiyaga ega sudlarga keltiriladi. Ushbu band majburiy qonun ostida kompetent sudlarga da'vo qilish huquqlaringizni cheklamaydi.",
    },
    {
      title: "DSA mosligi (Raqamli xizmatlar to'g'risi)",
      body: "Agar Ilova Raqamli xizmatlar to'g'risi (Regulation (EU) 2022/2065, \"DSA\") ostida vositachi xizmat sifatida belgilansa, yuqoridagi shartlarga qo'shimcha ravishda quyidagi bandlar qo'llanadi.",
      bullets: [
        "Aloqa nuqtasi: Xizmat ko'rsatuvchi Yevropa Ittifoqi organlari va xizmat qabul qiluvchilar bilan to'g'ridan-to'g'ri aloqa uchun yagona aloqa nuqtasini saqlaydi, unga help@mysaloon.uz manzili orqali murojaat qilish mumkin. Xizmat ko'rsatuvchi Yevropa Ittifoqidan tashqarida tashkil etilgan bo'lsa, DSAning 13-moddasiga muvofiq YEvropada qonuniy vakil belgilangan.",
        "Kontent moderatsiyasi va sabablarni bayon qilish: Xizmat ko'rsatuvchi kontentga kirishni cheklaganda, hisobni to'xtatganda yoki tugatganda yoki Ilova funksiyalarining mavjudligini cheklaganda, ta'sirlangan foydalanuvchiga aniq va o'ziga xos sabablarni bayon qiladi. Bayon cheklash tabiati, qaror qonuniy yoki shartnoma asosi va mavjud qayta ko'rib chiqish mexanizmlari haqida ma'lumotlarni o'z ichiga oladi, DSAning 17-moddasiga muvofiq.",
        "Xabar va harakat: Foydalanuvchilar va uchinchi tomonlar ushbu Shartlarda ko'rsatilgan aloqa ma'lumotlari orqali taxmin qilinayotgan noqonuniy kontent haqida xabarlar yuborishi mumkin. Xizmat ko'rsatuvchi xabalarni tez, ehtiyotkorlik bilan va inson ko'rib chiqishi zarur bo'lgan holatlarda avtomatik qaror qabul qilmasdan qayta ishlaydi. Xabarlar elektron tarzda tasdiqlanadi va qaror DSAning 16-moddasiga muvofiq kechikmasiz kommunikatsiya qilinadi.",
        "Sud tashqarisidagi nizo hal qilish: Kontent moderatsiyasi qarorlari, jumladan kontentni cheklash yoki hisoblarni to'xtatish qarorlari bo'yicha nizolar DSAning 21-moddasiga muvofiq tasdiqlangan sud tashqarisidagi nizo hal qilish organiga topshirilishi mumkin. Xizmat ko'rsatuvchi bunday organlar bilan yaxshi niyatda ishlashadi. Sud tashqarisidagi nizo hal qilishdan foydalanish qo'llanadigan qonun ostida sud huquqiga ega bo'lish huquqingizga ta'sir qilmaydi.",
        "Shaffoflik hisoboti: Xizmat ko'rsatuvchi DSAning 24-moddasiga muvofiq kontent moderatsiyasi faoliyatlarini, jumladan qabul qilingan xabarlar soni, qabul qilingan choralar va ishlatilgan avtomatik vositalarni o'z ichiga olgan davriy shaffoflik hisobotlarini nashr qiladi. Hisobotlar help@mysaloon.uz manzili orqali so'rov bo'yicha taqdim etiladi.",
      ],
    },
    {
      title: "Ajralish",
      body: "Agar kompetent sud tomonidan ushbu Foydalanish shartlarining bandi haqida, noqonuniy yoki qo'llanilmaydigan deb topilsa, bunday band u to'g'ri va qo'llanadigan qilib o'zgartiriladi va qolgan shartlar to'liq kuchda qoladi.",
    },
    {
      title: "To'liq bitim",
      body: "Ushbu Foydalanish shartlari, Maxfiylik siyosati bilan birgalikda, Ilovadan foydalanishingiz haqida siz va Xizmat ko'rsatuvchi o'rtasidagi to'liq bitimni tashkil qiladi va oldingi bitimlar yoki tushunchalarni almashtiradi.",
    },
    {
      title: "Ushbu foydalanish shartlariga o'zgarishlar",
      body: "Xizmat ko'rsatuvchi vaqti-vaqti bilan ularning Foydalanish shartlarini yangilashi mumkin. Shuning uchun, o'zgarishlar uchun ushbu sahifani muntazam ravishda ko'rib chiqishingiz tavsiya etiladi. Xizmat ko'rsatuvchi o'zgarishlarni ushbu sahifada yangi Foydalanish shartlarini e'lon qilish orqali sizga xabar beradi. Foydalanish shartlarining oldingi versiyalari saqlanadi va Xizmat ko'rsatuvchiga help@mysaloon.uz manzili orqali so'rov bo'yicha taqdim etiladi.",
    },
    {
      title: "Biz bilan bog'lanish",
      body: "Foydalanish shartlari bo'yicha savollaringiz yoki takliflaringiz bo'lsa, Xizmat ko'rsatuvchiga help@mysaloon.uz elektron pochta manzili orqali murojaat qiling.",
    },
    {
      title: "Foydalanish shartlari generatori",
      body: "Ushbu Foydalanish shartlari sahifasi [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/) tomonidan yaratilgan.",
    },
  ],
};

const RU: TermsDoc = {
  title: "Условия использования",
  updated: "Эти условия использования вступают в силу с 2026-10-22",
  intro:
    "Эти условия использования применяются к приложению Mysaloon для мобильных устройств и веб-браузеров, а также к любым связанным услугам, управляемым Абдурахимом Ориповым (совместно именуемым «Приложение»). Абдурахим Орипов именуется в этом документе как «Поставщик услуг». Загружая или используя Приложение, вы соглашаетесь с этими Условиями использования. Вы должны внимательно прочитать их перед использованием Приложения.",
  contactEmail: CONTACT_EMAIL,
  externalLink: EXTERNAL_LINK,
  sections: [
    {
      title: "Лицензия на использование Приложения",
      body: "При условии соблюдения этих Услов Поставщик услуг предоставляет вам ограниченную, неисключительную, непередаваемую, отзываемую лицензию на установку и использование Приложения на мобильном устройстве или компьютере для личных или внутренних бизнес-целей. Вы не можете воспроизводить, распространять, изменять, создавать производные работы, обратное инжиниринг, декомпилировать или разбирать Приложение, за исключением случаев, когда такая деятельность явно разрешена применимым законом.",
    },
    {
      title: "Интеллектуальная собственность",
      body: "Поставщик услуг сохраняет все права интеллектуальной собственности на Приложение, включая его код, дизайн, товарные знаки, знаки обслуживания, торговые названия, логотипы и брендинг («IP»). Ничто в этих Условиях не предоставляет вам лицензию или право использовать товарные знаки, логотипы или брендинг Поставщика услуг для любой цели. Вы соглашаетесь не удалять, изменять или скрывать любые уведомления об авторских правах, товарных знаках или других правах собственности, отображаемые в или на Приложении.",
    },
    {
      title: "Прекращение",
      body: "Поставщик услуг может приостановить ваш доступ к Приложению или услугам, если вы существенно нарушите эти Условия. Поставщик услуг предоставит вам письменное уведомление о нарушении и, если нарушение может быть исправлено, у вас будет 14 дней с момента получения уведомления для его устранения. Если вы не устраните нарушение в течение этого периода, Поставщик услуг может прекратить ваш доступ. Поставщик услуг может приостановить или прекратить ваш доступ немедленно без уведомления, если вы нарушаете применимый закон, нарушаете права интеллектуальной собственности или занимаетесь деятельностью, которая может нанести вред другим пользователям или Поставщику услуг. При прекращении ваше право на использование Приложения заканчивается, и вы должны удалить все копии с ваших устройств.",
    },
    {
      title: "Возраст и юридическое соответствие",
      body: "Доступ к этому Приложению и его использование означают, что вы юридически имеете право использовать его в вашей юрисдикции. Вам должно быть не менее 13 лет (возраст цифрового согласия в вашей юрисдикции) для использования Приложения. Если вам меньше 13 лет, родитель или законный опекун должен пересмотреть и принять эти Условия от вашего имени. Несанкционированное копирование, изменение Приложения, любой его части или товарных знаков Поставщика услуг строго запрещено. Любые попытки извлечь исходный код Приложения, перевести Приложение на другие языки или создать производные версии не разрешены. Все товарные знаки, авторские права, права базы данных и другие права интеллектуальной собственности, связанные с Приложением, остаются собственностью Поставщика услуг.",
    },
    {
      title: "Контент, создаваемый пользователями, и приемлемое использование",
      body: "Если это Приложение позволяет пользователям публиковать, делиться или загружать контент, вы соглашаетесь не публиковать контент, который:",
      bullets: [
        "Является незаконным или нарушает права интеллектуальной собственности третьих лиц (авторское право, товарные знаки, патенты)",
        "Является оскорбительным, угрожающим, преследовательским, клеветническим или речью ненависти",
        "Содержит дискриминацию или подстрекательство к насилию или незаконной деятельности",
        "Является спамом, фишингом или содержит вредоносное ПО",
        "Нарушает конфиденциальность или права на личные данные других",
        "Является вводящим в заблуждение, ложным или обманным",
        "Содержит откровенное насилие или сексуальный контент (если не имеет соответствующих возрастных ограничений)",
      ],
    },
    {
      title: "Модерация контента",
      body: "Поставщик услуг оставляет за собой право удалить или отключить доступ к контенту, нарушающему эти рекомендации, приостановить или прекратить учетные записи пользователей, которые неоднократно нарушают эти рекомендации, сотрудничать с правоохранительными органами, если сообщается о незаконном контенте, и модерировать, фильтровать или скрывать контент, нарушающий эти Условия, применимый закон или рекомендации, изложенные выше. Контент, отправленный через Приложение, может быть виден другим пользователям или общественности, в зависимости от того, как работает Приложение.",
    },
    {
      title: "Сообщение о контенте",
      body: "Если вы считаете, что контент нарушает эти Условия, нарушает ваши права или является незаконным, вы можете сообщить об этом Поставщику услуг по адресу help@mysaloon.uz. Сообщение должно содержать достаточно информации для Поставщика услуг, чтобы идентифицировать контент, оценить жалобу и связаться с вами, если требуется дальнейшее действие. Там, где Приложение предоставляет такие функции, вы также можете сообщить о контенте, заблокировать других пользователей или отключить уведомления непосредственно через интерфейс Приложения. Поставщик услуг будет рассматривать внутриприложные отчеты с теми же стандартами, описанными в этих Условиях.",
    },
    {
      title: "Лицензия на контент",
      body: "Отправляя контент, созданный пользователями, вы предоставляете Поставщику услуг неисключительную, всемирную, без роялти лицензию на использование, воспроизведение, распространение, подготовку производных работ, отображение и исполнение контента в связи с Приложением и бизнесом Поставщика услуг. Эта лицензия не дает Поставщику услуг право продавать или сублицензировать ваш контент третьим лицам независимо от Приложения. Вы представляете и гарантируете, что владеете или контролируете все права на контент, который вы публикуете, и что использование контента не нарушает эти Условия или применимый закон. Ваш контент может включать личные данные. Обработка личных данных, связанных с контентом, созданным пользователями, регулируется Политикой конфиденциальности. Не публикуйте личные данные других без их согласия.",
    },
    {
      title: "Ценообразование и безопасность устройства",
      body: "Поставщик услуг стремится сделать Приложение максимально полезным и эффективным. В связи с этим они оставляют за собой право изменить Приложение или взимать плату за свои услуги в любое время и по любой причине. Поставщик услуг гарантирует, что любые сборы за Приложение или его услуги будут четко вам сообщены. Приложение хранит и обрабатывает личные данные, которые вы предоставили Поставщику услуг для предоставления Сервиса. Обеспечение безопасности вашего мобильного устройства или компьютера и доступа к Приложению является вашей ответственностью. Поставщик услуг настоятельно не рекомендует джейлбрейкинг или рутинг вашего мобильного устройства или компьютера, что включает удаление программных ограничений и ограничений, наложенных официальной операционной системой вашего мобильного устройства или компьютера. Такие действия могут подвергнуть ваше устройство или компьютер вредоносному ПО, вирусам, вредоносным программам, скомпрометировать функции безопасности вашего устройства или компьютера и могут привести к тому, что Приложение не будет работать правильно или вообще не будет работать.",
    },
    {
      title: "Сторонние сервисы",
      body: "Обратите внимание, что Поставщик услуг не берет на себя ответственность за определенные аспекты. Некоторые функции Приложения требуют активного интернет-соединения, которое может быть Wi-Fi или предоставляться вашим мобильным оператором. Поставщик услуг не может нести ответственность, если Приложение не работает на полную мощность из-за отсутствия доступа к Wi-Fi или если вы исчерпали лимит данных. Если вы используете приложение вне зоны Wi-Fi, обратите внимание, что условия соглашения вашего мобильного оператора все еще применяются. Следовательно, вы можете понести расходы от вашего мобильного оператора за использование данных во время подключения к приложению или другие сторонние расходы. Используя приложение, вы принимаете ответственность за любые такие расходы, включая расходы на роуминг данных, если вы используете приложение за пределами вашей домашней территории (т.е. региона или страны) без отключения роуминга данных. Если вы не оплачиваете счет за устройство, на котором вы используете приложение, они предполагают, что вы получили разрешение от плательщика счета.",
    },
    {
      title: "Интернет-соединение и расходы на данные",
      body: "Обратите внимание, что Поставщик услуг не берет на себя ответственность за определенные аспекты. Некоторые функции Приложения требуют активного интернет-соединения. Поставщик услуг не может нести ответственность, если Приложение не работает на полную мощность из-за отсутствия доступа к интернету или если вы исчерпали лимит данных. При использовании Приложения обратите внимание, что условия соглашения вашего интернет-провайдера все еще применяются. Следовательно, вы можете понести расходы от вашего интернет-провайдера за использование данных во время использования Приложения. Используя Приложение, вы принимаете ответственность за любые такие расходы. Точно так же Поставщик услуг не всегда может нести ответственность за ваше использование приложения. Например, ваша ответственность — убедиться, что ваше устройство заряжено. Если батарея вашего устройства разрядится и вы не сможете получить доступ к Сервису, Поставщик услуг не может нести ответственность.",
    },
    {
      title: "Защита потребителей",
      body: "Ничто в этих Условиях не ограничивает какие-либо права, которые у вас есть согласно применимым законам о защите потребителей, которые не могут быть законно исключены.",
    },
    {
      title: "Ограничение ответственности",
      body: "В максимально возможной степени, разрешенной законом, Поставщик услуг не несет ответственности за любые косвенные, случайные, специальные, косвенные или штрафные убытки, включая, но не ограничиваясь, потерю прибыли, потерю данных или прерывание бизнеса, даже если он был предупрежден о возможности таких убытков. Однако Поставщик услуг сохраняет полную ответственность за смерть или личный ущерб, вызванный небрежностью, мошенничество или мошенническое введение в заблуждение, и любую другую ответственность, которая не может быть исключена или ограничена согласно применимому закону. В максимально возможной степени, разрешенной законом, общая ответственность Поставщика услуг по любому требованию не превышает сумму, уплаченную вами Поставщику услуг за Приложение в течение 12 месяцев, предшествующих требованию, или минимальную сумму, которая должна быть уплачена согласно применимому закону, в зависимости от того, что больше. Если Приложение предоставляется бесплатно, это означает, что ответственность Поставщика услуг ограничена минимальной суммой, разрешенной применимым законом. Поставщик услуг не принимает никакой ответственности за любые потери, прямые или косвенные, которые вы испытываете в результате полного полагания на стороннюю информацию, предоставленную через это Приложение, или за неточности в контенте, предоставленном третьими сторонами.",
    },
    {
      title: "Индемнификация",
      body: "В максимально возможной степени, разрешенной законом, вы соглашаетесь indemnify и возместить Поставщика услуг, его аффилированные лица, должностных лиц, директоров, сотрудников и агентов от любых претензий, обязательств, убытков, потерь и расходов, включая разумные юридические сборы, возникающих в результате или прямо связанных с нарушением вами этих Условий или вашего намеренного неправильного использования Приложения, включая контент, созданный пользователями, который вы отправляете в нарушение этих Условий. Эта индемнификация не применяется к претензиям, возникающим из собственной небрежности Поставщика услуг, нарушения этих Условий или нарушения применимого закона. В юрисдикциях, где потребительская индемнификация ограничена законом, этот пункт будет ограничен до максимально возможной степени.",
    },
    {
      title: "Искусственный интеллект",
      body: "Приложение включает технологии искусственного интеллекта (AI) для предоставления определенных функций или услуг. Используя Приложение, вы признаете и соглашаетесь, что AI может использоваться для обработки данных и предоставления функциональности. Поставщик услуг гарантирует, что все использование AI соответствует применимым законам и разработано для улучшения пользовательского опыта.",
    },
    {
      title: "Обновления и прекращение",
      body: "Поставщик услуг может в какой-то момент пожелать обновить приложение. Приложение в настоящее время доступно в соответствии с требованиями операционной системы (и для любых дополнительных систем, которые они решат расширить доступность приложения) может измениться, и вам нужно будет загрузить обновления, если вы хотите продолжать использовать приложение. Поставщик услуг не гарантирует, что он всегда будет обновлять приложение так, чтобы оно было актуально для вас и/или совместимо с конкретной версией операционной системы, установленной на вашем устройстве. Вы должны принимать обновления, когда они предлагаются; если вы решите не принимать, Поставщик услуг может прекратить поддержку более ранних версий, и Приложение может работать неправильно. Поставщик услуг также может пожелать прекратить предоставление приложения и может прекратить его использование в любое время без предоставления уведомления о прекращении. Если они не сообщат вам иное, при любом прекращении (a) права и лицензии, предоставленные вам в этих условиях, заканчиваются; (b) вы должны прекратить использование приложения и (при необходимости) удалить его с вашего устройства.",
    },
    {
      title: "Применяемое право и юрисдикция",
      body: "Эти Условия использования регулируются законами юрисдикции, в которой учрежден Поставщик услуг, за исключением правил коллизионного права, за исключением случаев, когда обязательные законы о защите потребителей предусматривают иное. Любой спор, возникающий из этих Условий или связанный с ними, будет передан в суды, имеющие юрисдикцию согласно применимому закону. Ничто в этом пункте не ограничивает какие-либо права, которые у вас могут быть на подачу иска в суде, компетентном согласно обязательному закону.",
    },
    {
      title: "Соответствие DSA (Закон о цифровых услугах)",
      body: "Если Приложение является посредническим сервисом, как определено в Законе о цифровых услугах (Регламент (ЕС) 2022/2065, «DSA»), следующие положения применяются в дополнение к указанным выше условиям.",
      bullets: [
        "Точка контакта: Поставщик услуг поддерживает единую точку контакта для прямой связи с органами ЕС и получателями услуги, доступную по адресу help@mysaloon.uz. Где Поставщик услуг учрежден вне Европейского Союза, юридический представитель в ЕС был назначен в соответствии со статьей 13 DSA.",
        "Модерация контента и заявление о причинах: Когда Поставщик услуг ограничивает доступ к контенту, приостанавливает или прекращает учетную запись или иным образом ограничивает доступность функций Приложения, затронутому пользователю будет предоставлено четкое и конкретное заявление о причинах. Заявление будет включать характер ограничения, юридическую или договорную основу решения и информацию о доступных механизмах возмещения в соответствии со статьей 17 DSA.",
        "Уведомление и действие: Пользователи и третьи стороны могут подавать уведомления о предположительно незаконном контенте через контактные данные, указанные в этих Условиях. Поставщик услуг будет обрабатывать уведомления оперативно, добросовестно и без автоматического принятия решений, где обстоятельства требуют человеческого рассмотрения. Уведомления будут подтверждены электронным способом, а решение будет сообщено без неоправданной задержки в соответствии со статьей 16 DSA.",
        "Внесудебное урегулирование споров: Споры, касающиеся решений по модерации контента, включая решения об ограничении контента или приостановке учетных записей, могут быть переданы органу по внесудебному урегулированию споров, сертифицированному в соответствии со статьей 21 DSA. Поставщик услуг будет добросовестно взаимодействовать с такими органами. Использование внесудебного урегулирования споров не влияет на ваше право на судебное средство согласно применимому закону.",
        "Отчетность о прозрачности: Поставщик услуг публикует периодические отчеты о прозрачности, охватывающие деятельность по модерации контента, включая количество полученных уведомлений, принятых мер и используемых автоматических средств, в соответствии со статьей 24 DSA. Отчеты доступны по запросу по адресу help@mysaloon.uz.",
      ],
    },
    {
      title: "Делимость",
      body: "Если какое-либо положение этих Условий использования признается недействительным, незаконным или не имеющим законной силы судом компетентной юрисдикции, такое положение будет изменено в минимальной степени, необходимой для того, чтобы сделать его действительным и имеющим законную силу, а остальные положения этих Условий останутся в полной силе и действии.",
    },
    {
      title: "Полное соглашение",
      body: "Эти Условия использования вместе с Политикой конфиденциальности составляют полное соглашение между вами и Поставщиком услуг касательно вашего использования Приложения, заменяя любые предыдущие соглашения или понимания.",
    },
    {
      title: "Изменения в этих Условиях использования",
      body: "Поставщик услуг может периодически обновлять свои Условия использования. Поэтому вам рекомендуется регулярно проверять эту страницу на наличие изменений. Поставщик услуг уведомит вас о любых изменениях, опубликовав новые Условия использования на этой странице. Предыдущие версии этих Условий использования будут поддерживаться и доступны по запросу, связавшись с Поставщиком услуг по адресу help@mysaloon.uz.",
    },
    {
      title: "Свяжитесь с нами",
      body: "Если у вас есть вопросы или предложения об Условиях использования, пожалуйста, не стесняйтесь связаться с Поставщиком услуг по электронной почте help@mysaloon.uz.",
    },
    {
      title: "Генератор условий использования",
      body: "Эта страница условий использования была создана с помощью [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/)",
    },
  ],
};

export function getTerms(lang: string | undefined): TermsDoc {
  const code = (lang ?? "uz").toLowerCase();
  if (code.startsWith("en")) return EN;
  if (code.startsWith("ru")) return RU;
  return UZ;
}
