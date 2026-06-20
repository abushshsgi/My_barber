import type { AppLang } from "@/i18n/config";
import type { CurrencyCode } from "@mybarber/shared/currency";

export const LANG_FLAGS: Record<AppLang, string> = {
  uz: "🇺🇿",
  ru: "🇷🇺",
  en: "🇬🇧",
};

export const CURRENCY_VISUAL: Record<CurrencyCode, { flag: string; symbol: string }> = {
  UZS: { flag: "🇺🇿", symbol: "so'm" },
  USD: { flag: "🇺🇸", symbol: "$" },
  EUR: { flag: "🇪🇺", symbol: "€" },
  RUB: { flag: "🇷🇺", symbol: "₽" },
  KZT: { flag: "🇰🇿", symbol: "₸" },
  KGS: { flag: "🇰🇬", symbol: "с" },
  TJS: { flag: "🇹🇯", symbol: "SM" },
  TRY: { flag: "🇹🇷", symbol: "₺" },
  CNY: { flag: "🇨🇳", symbol: "¥" },
  AED: { flag: "🇦🇪", symbol: "د.إ" },
};
