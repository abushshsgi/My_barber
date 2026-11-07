export type PaywallHero = {
  kicker: string;
  title: string;
  subtitle: string;
};

const CHAT_UZ: PaywallHero[] = [
  {
    kicker: "Chat limiti tugadi",
    title: "Suhbatni davom ettiring",
    subtitle: "Plus bilan 150 000 token — Morf AI yana javob beradi",
  },
  {
    kicker: "Bepul tokenlar tugadi",
    title: "Maslahat shu yerda to‘xtamasin",
    subtitle: "Premium ochilsa, Morf AI soch va uslub bo‘yicha yana yozadi",
  },
  {
    kicker: "Limitga yetdingiz",
    title: "Keyingi savolingiz javobsiz qolmasin",
    subtitle: "Plus — 150 000 token. Pro — 500 000 token. Tanlang va davom eting",
  },
  {
    kicker: "Chat pauzada",
    title: "Stilistingizni qayta yoqing",
    subtitle: "Bir oylik Premium: try-on, chat va Studio bitta to‘lovda",
  },
  {
    kicker: "Morf AI kutmoqda",
    title: "Yana 150 000 token oching",
    subtitle: "Plus bilan shaxsiy maslahat, ovoz va yuqori limitlar",
  },
  {
    kicker: "Bepul paket tugadi",
    title: "Premium — suhbatni yangilang",
    subtitle: "Payme orqali 1 oy. Avtomatik yechim yo‘q — o‘zingiz boshqarasiz",
  },
  {
    kicker: "Tokenlar tugadi",
    title: "Soch uslubi uchun AI yana yonida",
    subtitle: "Plus: 20 try-on, 150 000 chat token, Studio ochiladi",
  },
  {
    kicker: "Cheklov ishladi",
    title: "Ko‘proq xabar — aniqroq natija",
    subtitle: "Pro bilan 500 000 token, 100 ta try-on va to‘liq Studio",
  },
  {
    kicker: "Chat yopildi",
    title: "Qayta ochish — bir bosish",
    subtitle: "Uzcard yoki Humo. Premium darhol, bekor qilish istalgan payt",
  },
  {
    kicker: "Limit eslatmasi",
    title: "Morf AI hali yordam bera oladi",
    subtitle: "Plus 29 990 so‘m / oy — tokenlar tiklanadi, suhbat davom etadi",
  },
  {
    kicker: "Bepul sinov tugadi",
    title: "Endi professional rejim",
    subtitle: "Parvarish, tarkib skani va Studio faqat Premiumda",
  },
  {
    kicker: "Xabarlar tugadi",
    title: "Uslub bo‘yicha suhbatni tiklang",
    subtitle: "150 000 token Plusda. Savol bering — Morf AI javob beradi",
  },
  {
    kicker: "Kvota to‘ldi",
    title: "Yana so‘rang, yana sinab ko‘ring",
    subtitle: "Premiumda try-on + chat + Studio. To‘lov qaytarilmaydi, muddat ishlaydi",
  },
  {
    kicker: "AI pauzada",
    title: "Premium bilan davom eting",
    subtitle: "Bir oy Morf AI. Istalgan payt bekor — huquq muddat oxirigacha",
  },
  {
    kicker: "Suhbat to‘xtadi",
    title: "Yana so‘rang — javob Plusda",
    subtitle: "Payme: Uzcard yoki Humo. 1 oy, avtomatik yechim yo‘q",
  },
  {
    kicker: "Morf AI cheklovda",
    title: "150 000 token — yangi bosqich",
    subtitle: "Plus mashhur. Pro esa 500 000 token va 100 ta try-on",
  },
  {
    kicker: "Bepul chat tugadi",
    title: "Stilistni qayta ishga tushiring",
    subtitle: "Try-on, ovoz va Studio — Premium ochilganda birga",
  },
  {
    kicker: "Token limitti",
    title: "Savolingiz hali ochiq",
    subtitle: "29 990 so‘m / oy Plus. Bekor qilsangiz ham muddat ishlaydi",
  },
  {
    kicker: "Yana bir savol bormi",
    title: "Morf AI javobini kutmoqda",
    subtitle: "Plus ochilsa, tokenlar qaytadi va suhbat uzilmaydi",
  },
  {
    kicker: "Bepul limit yopildi",
    title: "Stil bo‘yicha maslahat davom etsin",
    subtitle: "Bir oy, Payme, avtomatik yechim yo‘q — bekor qilish sizda",
  },
  {
    kicker: "Chat to‘xtab qoldi",
    title: "150 000 token bilan qayting",
    subtitle: "Try-on va Studio ham shu Premiumda ochiladi",
  },
  {
    kicker: "Navbatdagi qadam",
    title: "Premium suhbatni ochadi",
    subtitle: "29 990 so‘m. Muddat tugaguncha huquq saqlanadi",
  },
  {
    kicker: "Yangi look",
    title: "Selfiedan tayyor uslubgacha",
    subtitle: "Morf AI yuzingizga mos soch variantini bir necha soniyada ko‘rsatadi",
  },
  {
    kicker: "Studio ochiq",
    title: "Lookni o‘zingiz tahrirlang",
    subtitle: "Plus va Pro da Studio — aniqroq natija, ko‘proq urinish",
  },
  {
    kicker: "Parvarish",
    title: "Sochingiz uchun aniq reja",
    subtitle: "Ob-havo, tarkib skani va o‘sish prognozi Premiumda yonadi",
  },
];

const CHAT_RU: PaywallHero[] = [
  {
    kicker: "Лимит чата исчерпан",
    title: "Продолжите диалог",
    subtitle: "Plus даёт 150 000 токенов — Morf AI снова отвечает",
  },
  {
    kicker: "Бесплатные токены кончились",
    title: "Пусть совет не обрывается",
    subtitle: "С Premium Morf AI снова поможет с волосами и стилем",
  },
  {
    kicker: "Достигли лимита",
    title: "Следующий вопрос не останется без ответа",
    subtitle: "Plus — 150 000 токенов. Pro — 500 000. Выберите и продолжайте",
  },
  {
    kicker: "Чат на паузе",
    title: "Включите стилиста снова",
    subtitle: "Месяц Premium: try-on, чат и Studio в одном платеже",
  },
  {
    kicker: "Morf AI ждёт",
    title: "Откройте ещё 150 000 токенов",
    subtitle: "Plus: личные советы, голос и высокий лимит",
  },
  {
    kicker: "Бесплатный пакет закончился",
    title: "Premium — обновите диалог",
    subtitle: "Один месяц через Payme. Автосписания нет — вы решаете",
  },
  {
    kicker: "Токены закончились",
    title: "AI снова рядом с вашим образом",
    subtitle: "Plus: 20 try-on, 150 000 токенов чата, открывается Studio",
  },
  {
    kicker: "Сработал лимит",
    title: "Больше сообщений — точнее результат",
    subtitle: "Pro: 500 000 токенов, 100 try-on и полная Studio",
  },
  {
    kicker: "Чат закрыт",
    title: "Откройте снова одним касанием",
    subtitle: "Uzcard или Humo. Premium сразу, отмена в любой момент",
  },
  {
    kicker: "Напоминание о лимите",
    title: "Morf AI ещё может помочь",
    subtitle: "Plus 29 990 сум / мес — токены обновятся, диалог продолжится",
  },
  {
    kicker: "Пробный лимит кончился",
    title: "Перейдите в профессиональный режим",
    subtitle: "Уход, скан состава и Studio только в Premium",
  },
  {
    kicker: "Сообщения закончились",
    title: "Верните диалог о стиле",
    subtitle: "150 000 токенов в Plus. Спросите — Morf AI ответит",
  },
  {
    kicker: "Квота заполнена",
    title: "Спрашивайте и пробуйте снова",
    subtitle: "В Premium: try-on + чат + Studio. Срок действует до конца периода",
  },
  {
    kicker: "AI на паузе",
    title: "Продолжите с Premium",
    subtitle: "Месяц Morf AI. Отмена в любой момент — доступ до конца срока",
  },
  {
    kicker: "Диалог остановился",
    title: "Спросите снова — ответ в Plus",
    subtitle: "Payme: Uzcard или Humo. Один месяц, без автосписания",
  },
  {
    kicker: "Morf AI на лимите",
    title: "150 000 токенов — новый этап",
    subtitle: "Plus популярен. Pro: 500 000 токенов и 100 try-on",
  },
  {
    kicker: "Бесплатный чат кончился",
    title: "Снова включите стилиста",
    subtitle: "Try-on, голос и Studio открываются вместе с Premium",
  },
  {
    kicker: "Лимит токенов",
    title: "Ваш вопрос всё ещё важен",
    subtitle: "Plus 29 990 сум / мес. После отмены срок всё равно действует",
  },
  {
    kicker: "Есть ещё вопрос",
    title: "Morf AI ждёт ответа",
    subtitle: "С Plus токены возвращаются и диалог не обрывается",
  },
  {
    kicker: "Бесплатный лимит закрыт",
    title: "Пусть совет по стилю продолжится",
    subtitle: "Месяц через Payme, без автосписания — отмена за вами",
  },
  {
    kicker: "Чат остановился",
    title: "Вернитесь с 150 000 токенов",
    subtitle: "Try-on и Studio открываются в том же Premium",
  },
  {
    kicker: "Следующий шаг",
    title: "Premium открывает диалог",
    subtitle: "29 990 сум. Доступ сохраняется до конца срока",
  },
  {
    kicker: "Новый образ",
    title: "От селфи до готового стиля",
    subtitle: "Morf AI за секунды показывает причёску на вашем лице",
  },
  {
    kicker: "Studio открыта",
    title: "Доведите look сами",
    subtitle: "В Plus и Pro Studio даёт точнее результат и больше попыток",
  },
  {
    kicker: "Уход",
    title: "Точный план для ваших волос",
    subtitle: "Погода, скан состава и прогноз роста включаются в Premium",
  },
];

const CHAT_EN: PaywallHero[] = [
  {
    kicker: "Chat limit reached",
    title: "Keep the conversation going",
    subtitle: "Plus unlocks 150,000 tokens so Morf AI can keep helping",
  },
  {
    kicker: "Free tokens used up",
    title: "Don’t stop mid-advice",
    subtitle: "Premium lets Morf AI keep answering on hair and style",
  },
  {
    kicker: "You’ve hit the cap",
    title: "Your next question still matters",
    subtitle: "Plus is 150,000 tokens. Pro is 500,000. Pick one and continue",
  },
  {
    kicker: "Chat is paused",
    title: "Turn your stylist back on",
    subtitle: "One month of Premium: try-on, chat, and Studio in one payment",
  },
  {
    kicker: "Morf AI is waiting",
    title: "Unlock 150,000 more tokens",
    subtitle: "Plus: personal advice, voice, and a higher limit",
  },
  {
    kicker: "Free pack ended",
    title: "Refresh the chat with Premium",
    subtitle: "One month via Payme. No auto-charge — you stay in control",
  },
  {
    kicker: "Tokens ran out",
    title: "Keep AI next to your look",
    subtitle: "Plus: 20 try-ons, 150,000 chat tokens, Studio unlocked",
  },
  {
    kicker: "Limit kicked in",
    title: "More messages, clearer results",
    subtitle: "Pro: 500,000 tokens, 100 try-ons, and full Studio",
  },
  {
    kicker: "Chat closed",
    title: "Reopen it in one tap",
    subtitle: "Uzcard or Humo. Premium starts now, cancel anytime",
  },
  {
    kicker: "Limit reminder",
    title: "Morf AI can still help",
    subtitle: "Plus is 29,990 UZS / month — tokens reset, chat continues",
  },
  {
    kicker: "Trial quota ended",
    title: "Switch to pro mode",
    subtitle: "Care, ingredient scan, and Studio are Premium-only",
  },
  {
    kicker: "Messages used up",
    title: "Bring the style chat back",
    subtitle: "150,000 tokens on Plus. Ask — Morf AI answers",
  },
  {
    kicker: "Quota full",
    title: "Ask again, try again",
    subtitle: "Premium: try-on + chat + Studio. Access lasts until the period ends",
  },
  {
    kicker: "AI on pause",
    title: "Continue with Premium",
    subtitle: "One month of Morf AI. Cancel anytime — access until expiry",
  },
  {
    kicker: "Chat stopped",
    title: "Ask again — Plus has the answer",
    subtitle: "Payme: Uzcard or Humo. One month, no auto-charge",
  },
  {
    kicker: "Morf AI hit a cap",
    title: "150,000 tokens, next stage",
    subtitle: "Plus is the popular pick. Pro: 500,000 tokens and 100 try-ons",
  },
  {
    kicker: "Free chat ended",
    title: "Turn the stylist back on",
    subtitle: "Try-on, voice, and Studio unlock together with Premium",
  },
  {
    kicker: "Token limit",
    title: "Your question is still open",
    subtitle: "Plus is 29,990 UZS / month. Cancel and the paid days still work",
  },
  {
    kicker: "One more question",
    title: "Morf AI is waiting to answer",
    subtitle: "Plus brings the tokens back so the chat does not stop",
  },
  {
    kicker: "Free limit closed",
    title: "Keep the style advice going",
    subtitle: "One month via Payme, no auto-charge — cancel when you want",
  },
  {
    kicker: "Chat stalled",
    title: "Come back with 150,000 tokens",
    subtitle: "Try-on and Studio unlock in the same Premium",
  },
  {
    kicker: "Next step",
    title: "Premium opens the chat",
    subtitle: "29,990 UZS. Access stays until the period ends",
  },
  {
    kicker: "New look",
    title: "From selfie to a finished style",
    subtitle: "Morf AI shows a haircut on your face in a few seconds",
  },
  {
    kicker: "Studio is open",
    title: "Edit the look yourself",
    subtitle: "Plus and Pro Studio means a sharper result and more tries",
  },
  {
    kicker: "Care",
    title: "A precise plan for your hair",
    subtitle: "Weather, ingredient scan, and growth forecast turn on with Premium",
  },
];

const SUB_UZ: PaywallHero[] = [
  {
    kicker: "AI Premium",
    title: "Obuna turini tanlang",
    subtitle: "Try-on, chat va Studio — bir oylik to‘lov, avtomatik yechim yo‘q",
  },
  {
    kicker: "Morf AI ochiladi",
    title: "O‘zingizga mos tarifni oling",
    subtitle: "Plus mashhur: 150 000 token va Studio. Payme — Uzcard/Humo",
  },
  {
    kicker: "Bir oy Premium",
    title: "Ko‘proq look, ko‘proq maslahat",
    subtitle: "Istalgan payt bekor qiling — to‘langan muddat oxirigacha ishlaydi",
  },
  {
    kicker: "Stilist cho‘ntagingizda",
    title: "Morf AI bilan yangi obraz",
    subtitle: "Starter, Plus yoki Pro. Narx shaffof, yashirin to‘lov yo‘q",
  },
  {
    kicker: "Limitlarni kengaytiring",
    title: "Premium hozir ochiladi",
    subtitle: "20–100 try-on / oy. Chat tokenlari tarifga qarab oshadi",
  },
  {
    kicker: "Payme orqali",
    title: "Xavfsiz to‘lov, darhol kirish",
    subtitle: "Obuna avtomatik yangilanmaydi. Bekor qilsangiz ham muddat saqlanadi",
  },
  {
    kicker: "Plus tavsiya etiladi",
    title: "Studio va parvarish ochilsin",
    subtitle: "29 990 so‘m / oy — try-on, 150 000 token, tarkib skani",
  },
  {
    kicker: "Pro — maksimum",
    title: "100 ta try-on va 500 000 token",
    subtitle: "Eng yuqori limitlar. Studio, parvarish va tarkib skani to‘liq ochiq",
  },
  {
    kicker: "Yangi uslub",
    title: "Selfie — va AI natija",
    subtitle: "Premiumda generatsiya ochiq. Bir oy, keyin o‘zingiz qaror qilasiz",
  },
  {
    kicker: "Shaxsiy AI",
    title: "Soch, soqol, parvarish — bir joyda",
    subtitle: "Chat + try-on + Studio. Bekor qilish istalgan vaqtda",
  },
  {
    kicker: "Obuna 30 kun",
    title: "Hozir boshlang, keyin o‘ylab ko‘ring",
    subtitle: "To‘lov qaytarilmaydi, lekin Premium muddat oxirigacha ishlaydi",
  },
  {
    kicker: "Tanlov sizniki",
    title: "Starter, Plus yoki Pro",
    subtitle: "Har safar shu sahifa — yangi taklif. Tarifni tanlab davom eting",
  },
  {
    kicker: "Bugungi taklif",
    title: "Morf AI ni bir oyga oching",
    subtitle: "Selfie, chat, Studio. To‘lov Payme — siz boshqarasiz",
  },
  {
    kicker: "Ko‘proq look",
    title: "Premium hozir ishga tushadi",
    subtitle: "Plus: 20 try-on, 150 000 token, parvarish ochiladi",
  },
  {
    kicker: "Yashirin to‘lov yo‘q",
    title: "Bir marta to‘lang, 30 kun foydalaning",
    subtitle: "Bekor qilish istalgan payt. Pul qaytmaydi, muddat saqlanadi",
  },
  {
    kicker: "AI stilist",
    title: "Obuna — yangi uslub sari",
    subtitle: "Starterdan boshlang yoki Plusni tanlang. Pro — maksimum",
  },
  {
    kicker: "Yuzingizga mos",
    title: "Try-on bir necha soniyada",
    subtitle: "Selfie yuboring — Morf AI soch uslubini sizda ko‘rsatadi",
  },
  {
    kicker: "Parvarish ochiq",
    title: "Sochingiz uchun shaxsiy reja",
    subtitle: "Ob-havo himoyasi, tarkib skani va o‘sish prognozi Premiumda",
  },
  {
    kicker: "Studio",
    title: "Lookni mayda-chuydasigacha tahrirlang",
    subtitle: "Plus va Pro da Morf AI Studio — o‘z uslubingizni aniqlang",
  },
  {
    kicker: "Hozir boshlang",
    title: "Bir oy yangi obraz",
    subtitle: "Try-on, chat va Studio. Bekor qilish istalgan payt, muddat saqlanadi",
  },
];

const SUB_RU: PaywallHero[] = [
  {
    kicker: "AI Premium",
    title: "Выберите тип подписки",
    subtitle: "Try-on, чат и Studio — месяц без автопродления",
  },
  {
    kicker: "Morf AI откроется",
    title: "Возьмите тариф под себя",
    subtitle: "Plus популярен: 150 000 токенов и Studio. Payme — Uzcard/Humo",
  },
  {
    kicker: "Месяц Premium",
    title: "Больше образов, больше советов",
    subtitle: "Отмена в любой момент — доступ до конца оплаченного срока",
  },
  {
    kicker: "Стилист в кармане",
    title: "Новый образ с Morf AI",
    subtitle: "Starter, Plus или Pro. Прозрачная цена, без скрытых списаний",
  },
  {
    kicker: "Расширьте лимиты",
    title: "Premium включается сразу",
    subtitle: "20–100 try-on / мес. Токены чата растут вместе с тарифом",
  },
  {
    kicker: "Через Payme",
    title: "Безопасная оплата, доступ сразу",
    subtitle: "Подписка не продлевается сама. После отмены срок сохраняется",
  },
  {
    kicker: "Рекомендуем Plus",
    title: "Откройте Studio и уход",
    subtitle: "29 990 сум / мес — try-on, 150 000 токенов, скан состава",
  },
  {
    kicker: "Pro — максимум",
    title: "100 try-on и 500 000 токенов",
    subtitle: "Самые высокие лимиты. Studio, уход и скан состава полностью открыты",
  },
  {
    kicker: "Новый стиль",
    title: "Селфи — и результат AI",
    subtitle: "В Premium генерация открыта. Месяц, дальше решаете вы",
  },
  {
    kicker: "Личный AI",
    title: "Волосы, борода, уход — в одном месте",
    subtitle: "Чат + try-on + Studio. Отмена в любой момент",
  },
  {
    kicker: "Подписка на 30 дней",
    title: "Начните сейчас, подумайте позже",
    subtitle: "Платёж не возвращается, но Premium работает до конца срока",
  },
  {
    kicker: "Выбор за вами",
    title: "Starter, Plus или Pro",
    subtitle: "Каждый заход — новое сообщение. Выберите тариф и продолжайте",
  },
  {
    kicker: "Предложение дня",
    title: "Откройте Morf AI на месяц",
    subtitle: "Селфи, чат, Studio. Оплата Payme — вы решаете",
  },
  {
    kicker: "Больше образов",
    title: "Premium включается сразу",
    subtitle: "Plus: 20 try-on, 150 000 токенов, открывается уход",
  },
  {
    kicker: "Без скрытых списаний",
    title: "Оплатите раз — пользуйтесь 30 дней",
    subtitle: "Отмена в любой момент. Деньги не возвращаются, срок сохраняется",
  },
  {
    kicker: "AI-стилист",
    title: "Подписка — к новому образу",
    subtitle: "Начните со Starter или возьмите Plus. Pro — максимум",
  },
  {
    kicker: "Под ваше лицо",
    title: "Try-on за несколько секунд",
    subtitle: "Отправьте селфи — Morf AI покажет причёску на вас",
  },
  {
    kicker: "Уход открыт",
    title: "Личный план для ваших волос",
    subtitle: "Защита по погоде, скан состава и прогноз роста — в Premium",
  },
  {
    kicker: "Studio",
    title: "Доведите образ до деталей",
    subtitle: "В Plus и Pro открывается Morf AI Studio",
  },
  {
    kicker: "Начните сейчас",
    title: "Месяц нового образа",
    subtitle: "Try-on, чат и Studio. Отмена в любой момент, срок сохраняется",
  },
];

const SUB_EN: PaywallHero[] = [
  {
    kicker: "AI Premium",
    title: "Choose a plan",
    subtitle: "Try-on, chat, and Studio — one month, no auto-renew",
  },
  {
    kicker: "Morf AI unlocks",
    title: "Pick the plan that fits",
    subtitle: "Plus is popular: 150,000 tokens and Studio. Payme — Uzcard/Humo",
  },
  {
    kicker: "One month of Premium",
    title: "More looks, more advice",
    subtitle: "Cancel anytime — access lasts until the paid period ends",
  },
  {
    kicker: "A stylist in your pocket",
    title: "A new look with Morf AI",
    subtitle: "Starter, Plus, or Pro. Clear price, no hidden charges",
  },
  {
    kicker: "Raise your limits",
    title: "Premium starts immediately",
    subtitle: "20–100 try-ons / month. Chat tokens scale with the plan",
  },
  {
    kicker: "Pay with Payme",
    title: "Secure payment, instant access",
    subtitle: "It does not auto-renew. After cancel, the remaining days still work",
  },
  {
    kicker: "Plus recommended",
    title: "Unlock Studio and care",
    subtitle: "29,990 UZS / month — try-on, 150,000 tokens, ingredient scan",
  },
  {
    kicker: "Pro is the max",
    title: "100 try-ons and 500,000 tokens",
    subtitle: "Highest limits. Studio, care, and ingredient scan fully open",
  },
  {
    kicker: "New style",
    title: "Selfie in, AI look out",
    subtitle: "Premium opens generation. One month, then you decide",
  },
  {
    kicker: "Personal AI",
    title: "Hair, beard, care — in one place",
    subtitle: "Chat + try-on + Studio. Cancel whenever you want",
  },
  {
    kicker: "30-day subscription",
    title: "Start now, decide later",
    subtitle: "No automatic refund, but Premium runs until expiry",
  },
  {
    kicker: "Your call",
    title: "Starter, Plus, or Pro",
    subtitle: "A fresh line each visit. Choose a plan and continue",
  },
  {
    kicker: "Today’s offer",
    title: "Unlock Morf AI for a month",
    subtitle: "Selfie, chat, Studio. Pay with Payme — you stay in control",
  },
  {
    kicker: "More looks",
    title: "Premium starts now",
    subtitle: "Plus: 20 try-ons, 150,000 tokens, care unlocked",
  },
  {
    kicker: "No hidden charges",
    title: "Pay once, use 30 days",
    subtitle: "Cancel anytime. No refund, remaining days still work",
  },
  {
    kicker: "AI stylist",
    title: "Subscribe toward a new look",
    subtitle: "Start with Starter or pick Plus. Pro is the max",
  },
  {
    kicker: "Made for your face",
    title: "Try-on in a few seconds",
    subtitle: "Send a selfie — Morf AI shows the haircut on you",
  },
  {
    kicker: "Care unlocked",
    title: "A personal plan for your hair",
    subtitle: "Weather shield, ingredient scan, and growth forecast on Premium",
  },
  {
    kicker: "Studio",
    title: "Edit the look until it fits",
    subtitle: "Plus and Pro unlock Morf AI Studio",
  },
  {
    kicker: "Start today",
    title: "A month of a new look",
    subtitle: "Try-on, chat, and Studio. Cancel anytime — paid days stay",
  },
];

const HERO_STORAGE_KEY = "mysaloon.paywall.hero.v4";

type HeroMemory = Record<string, number>;

let heroMemory: HeroMemory | null = null;

function localeCode(lang: string): "ru" | "en" | "uz" {
  if (lang.startsWith("ru")) return "ru";
  if (lang.startsWith("en")) return "en";
  return "uz";
}

function localeList(kind: "chat" | "subscribe", lang: string): PaywallHero[] {
  const loc = localeCode(lang);
  if (kind === "chat") {
    if (loc === "ru") return CHAT_RU;
    if (loc === "en") return CHAT_EN;
    return CHAT_UZ;
  }
  if (loc === "ru") return SUB_RU;
  if (loc === "en") return SUB_EN;
  return SUB_UZ;
}

function readHeroMemory(): HeroMemory {
  if (heroMemory) return heroMemory;
  heroMemory = {};
  try {
    const raw = globalThis.sessionStorage?.getItem(HERO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HeroMemory;
      if (parsed && typeof parsed === "object") heroMemory = parsed;
    }
  } catch {
    heroMemory = {};
  }
  return heroMemory;
}

function writeHeroMemory(data: HeroMemory) {
  heroMemory = data;
  try {
    globalThis.sessionStorage?.setItem(HERO_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* private mode / native */
  }
}

/**
 * Har chaqiruv — oldingisidan boshqa matn.
 * sessionStorage sahifa yangilansa ham ketma-ketlikni saqlaydi.
 */
export function pickPaywallHero(kind: "chat" | "subscribe", lang: string): PaywallHero {
  const list = localeList(kind, lang);
  const count = list.length;
  if (count === 0) return { kicker: "", title: "", subtitle: "" };

  const slot = `${kind}:${localeCode(lang)}`;
  const memory = readHeroMemory();
  const last = memory[slot];
  let index = Math.floor(Math.random() * count);
  if (count > 1 && index === last) {
    index = (index + 1 + Math.floor(Math.random() * (count - 1))) % count;
  }
  memory[slot] = index;
  writeHeroMemory(memory);
  return list[index]!;
}
