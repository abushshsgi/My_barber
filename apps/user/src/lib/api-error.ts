import i18n from "@/i18n/config";

const PHRASE_KEYS: Record<string, string> = {
  "Premium hali faol. Yangi obuna muddat tugagach xarid qilinadi.": "apiErrors.cancel_block_rebuy",
  "Joriy tarifdan past yoki teng tarifga o'tib bo'lmaydi. Yuqori tarifni tanlang.": "apiErrors.not_an_upgrade",
  "Bekor qilish uchun faol obuna topilmadi.": "apiErrors.cancel_missing",
  "Obuna bekor qilindi. Premium muddati tugaguncha ishlaydi.": "apiErrors.cancel_ok",
  "plan_code starter, plus yoki pro bo'lishi kerak.": "apiErrors.plan_code_invalid",
  "To'lov topilmadi.": "apiErrors.payment_not_found",
  "Noto'g'ri obuna rejasi.": "apiErrors.bad_plan",
  "Generatsiya uchun obuna kerak.": "apiErrors.subscription_required",
  "Generatsiya uchun obuna kerak yoki 1 ta do'stingizni taklif qiling (1 referal = 1 generatsiya).":
    "apiErrors.subscription_or_referral",
  "Ovozli suhbat Starter, Plus yoki Pro obunasida mavjud.": "apiErrors.voice_required",
  "Morf AI Studio Plus yoki Pro obunasida mavjud.": "apiErrors.studio_required",
  "Bu reja Morf AI generatsiyasini qo'llab-quvvatlamaydi. Tarifni yangilang.": "apiErrors.plan_no_tryon",
  "Morf AI Parvarish Plus obunasida mavjud.": "apiErrors.care_plus",
  "SOS va Javon faqat Pro obunasida mavjud.": "apiErrors.care_pro",
  "Payme to'lovi hali tasdiqlanmagan.": "apiErrors.payme_pending",
  "Payme to'lovi bekor qilingan.": "apiErrors.payme_cancelled",
  "Payme to'lovi muddati o'tgan.": "apiErrors.payme_expired",
  "Payme to'lovi qaytarilgan.": "apiErrors.payme_refunded",
  "Payme to'lovi muvaffaqiyatsiz.": "apiErrors.payme_failed",
  "Payme summasi tarif narxiga teng emas.": "apiErrors.payme_amount",
};

const LIMIT_PATTERNS: Array<{ re: RegExp; key: string }> = [
  { re: /^Bepul Morf AI chat tokenlari tugadi \((\d+)\/(\d+)\)\./, key: "apiErrors.chatFreeEnded" },
  { re: /^Oylik Morf AI chat token limiti tugadi \((\d+)\/(\d+)\)\./, key: "apiErrors.chatMonthEnded" },
  { re: /^Oylik Morf AI Studio limiti tugadi \((\d+)\/(\d+)\)\./, key: "apiErrors.studioMonthEnded" },
  { re: /^Oylik Morf AI limiti tugadi \((\d+)\/(\d+)\)\./, key: "apiErrors.tryonMonthEnded" },
];

function lookup(key: string, vars?: Record<string, string>): string | null {
  if (!i18n.exists(key)) return null;
  return String(i18n.t(key, vars));
}

/** Backend `code` yoki o'zbek matn — tanlangan tilda. */
export function translateApiDetail(detail: string, code?: string | null): string {
  const cleaned = detail.replace(/^API\s+\d+:\s*/i, "").replace(/\s+/g, " ").trim();
  if (code) {
    const byCode = lookup(`apiErrors.${code}`);
    if (byCode) return byCode;
  }
  const phrase = PHRASE_KEYS[cleaned];
  if (phrase) {
    const byPhrase = lookup(phrase);
    if (byPhrase) return byPhrase;
  }
  for (const pattern of LIMIT_PATTERNS) {
    const match = cleaned.match(pattern.re);
    if (!match) continue;
    const byPattern = lookup(pattern.key, { used: match[1], limit: match[2] });
    if (byPattern) return byPattern;
  }
  return cleaned;
}

export function appAcceptLanguage(): string {
  const raw = (i18n.resolvedLanguage || i18n.language || "uz").slice(0, 2).toLowerCase();
  if (raw === "ru" || raw === "en") return raw;
  return "uz";
}
