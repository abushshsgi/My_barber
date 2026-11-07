import i18n from "../i18n/config";

const NETWORK_RE =
  /unknownhostexception|no address associated with hostname|enotfound|getaddrinfo|network request failed|failed to fetch|internet|dns/i;

const TECH_API_RE =
  /could not satisfy|not acceptable|accept header|unsupported media type|parse error|expecting value|json parse|<html|traceback|integrityerror|operationalerror|disallowedhost/i;

const GATEWAY_RE =
  /application failed to respond|bad gateway|proxy_failed|upstream_timeout|gateway timeout|service unavailable|resource exhausted|too many requests/i;

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
  {
    re: /^Bepul Morf AI chat tokenlari tugadi \((\d+)\/(\d+)\)\./,
    key: "apiErrors.chatFreeEnded",
  },
  {
    re: /^Oylik Morf AI chat token limiti tugadi \((\d+)\/(\d+)\)\./,
    key: "apiErrors.chatMonthEnded",
  },
  {
    re: /^Oylik Morf AI Studio limiti tugadi \((\d+)\/(\d+)\)\./,
    key: "apiErrors.studioMonthEnded",
  },
  {
    re: /^Oylik Morf AI limiti tugadi \((\d+)\/(\d+)\)\./,
    key: "apiErrors.tryonMonthEnded",
  },
];

function lookupApiText(key: string, vars?: Record<string, string>): string | null {
  if (!i18n.exists(key)) return null;
  return String(i18n.t(key, vars));
}

/** Backend `code` yoki o'zbek matnini tanlangan tilga. */
export function translateApiDetail(detail: string, code?: string | null): string {
  const cleaned = detail.replace(/^API\s+\d+:\s*/i, "").replace(/\s+/g, " ").trim();
  if (code) {
    const byCode = lookupApiText(`apiErrors.${code}`);
    if (byCode) return byCode;
  }
  const phrase = PHRASE_KEYS[cleaned];
  if (phrase) {
    const byPhrase = lookupApiText(phrase);
    if (byPhrase) return byPhrase;
  }
  for (const pattern of LIMIT_PATTERNS) {
    const match = cleaned.match(pattern.re);
    if (!match) continue;
    const byPattern = lookupApiText(pattern.key, { used: match[1], limit: match[2] });
    if (byPattern) return byPattern;
  }
  return cleaned;
}

/** DRF/HTML/stacktrace kabi texnik matnni foydalanuvchi tiliga. */
export function sanitizeDisplayError(message: string, apiBase?: string): string {
  const raw = message.trim();
  const cleaned = raw.replace(/^API\s+\d+:\s*/i, "").trim();
  const probe = `${raw} ${cleaned}`;

  if (!cleaned) return i18n.t("errors.load");

  if (NETWORK_RE.test(probe)) return i18n.t("errors.network");
  if (/timeout|abort/i.test(probe) && !/qayta urin/i.test(cleaned)) {
    return i18n.t("errors.server");
  }
  if (/API\s+406\b/i.test(raw) || TECH_API_RE.test(probe)) {
    return i18n.t("errors.aiUnavailable");
  }
  if (GATEWAY_RE.test(cleaned)) {
    return i18n.t("errors.server");
  }
  if (/java\.|exception|at com\.|at java\./i.test(probe)) {
    return i18n.t("errors.network");
  }
  if (apiBase && raw.includes(apiBase)) {
    return raw.replace(/\s*\([^)]*https?:\/\/[^)]+\)\s*$/i, "").trim() || i18n.t("errors.load");
  }
  return translateApiDetail(cleaned);
}

/** RN/Android fetch xatolarini foydalanuvchi tiliga. */
export function friendlyNetworkError(err: unknown, apiBase?: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return sanitizeDisplayError(raw, apiBase);
}
