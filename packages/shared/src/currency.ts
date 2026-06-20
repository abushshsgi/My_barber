/** Bazaviy valyuta UZS — barcha narxlar DB da so'mda saqlanadi. */

export type CurrencyCode =
  | "UZS"
  | "USD"
  | "EUR"
  | "RUB"
  | "KZT"
  | "KGS"
  | "TJS"
  | "TRY"
  | "CNY"
  | "AED";

export const DEFAULT_CURRENCY: CurrencyCode = "UZS";

export const SUPPORTED_CURRENCY_CODES: CurrencyCode[] = [
  "UZS",
  "USD",
  "EUR",
  "RUB",
  "KZT",
  "KGS",
  "TJS",
  "TRY",
  "CNY",
  "AED",
];

const LOCALE_BY_CURRENCY: Partial<Record<CurrencyCode, string>> = {
  UZS: "uz-UZ",
  USD: "en-US",
  EUR: "de-DE",
  RUB: "ru-RU",
  KZT: "kk-KZ",
  TRY: "tr-TR",
  CNY: "zh-CN",
  AED: "ar-AE",
};

export type CurrencyRatesMap = Record<string, number>;

export function isCurrencyCode(value: string): value is CurrencyCode {
  return SUPPORTED_CURRENCY_CODES.includes(value as CurrencyCode);
}

/** amountUzs — so'mdagi summa; uzsPerUnit — 1 birlik valyuta necha so'm. */
export function convertFromUzs(
  amountUzs: number,
  code: CurrencyCode,
  uzsPerUnit: number,
): number {
  if (!Number.isFinite(amountUzs)) return 0;
  if (code === "UZS" || !uzsPerUnit) return Math.round(amountUzs);
  return Math.round((amountUzs / uzsPerUnit) * 100) / 100;
}

export function formatMoneyFromUzs(
  amountUzs: number,
  code: CurrencyCode,
  uzsPerUnit: number,
  locale = "uz-UZ",
): string {
  const converted = convertFromUzs(amountUzs, code, uzsPerUnit);
  const fmtLocale = LOCALE_BY_CURRENCY[code] ?? locale;

  if (code === "UZS") {
    return `${new Intl.NumberFormat(fmtLocale, { maximumFractionDigits: 0 }).format(converted)} so'm`;
  }

  try {
    return new Intl.NumberFormat(fmtLocale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "RUB" || code === "KZT" || code === "KGS" ? 0 : 2,
    }).format(converted);
  } catch {
    return `${converted.toLocaleString(fmtLocale)} ${code}`;
  }
}

export function shortMoneyFromUzs(
  amountUzs: number,
  code: CurrencyCode,
  uzsPerUnit: number,
): string {
  const converted = convertFromUzs(amountUzs, code, uzsPerUnit);
  if (code === "UZS") {
    if (converted >= 1_000_000) return `${(converted / 1_000_000).toFixed(1)}M`;
    if (converted >= 1_000) return `${Math.round(converted / 1_000)}k`;
    return String(Math.round(converted));
  }
  if (converted >= 1_000_000) return `${(converted / 1_000_000).toFixed(1)}M ${code}`;
  if (converted >= 1_000) return `${(converted / 1_000).toFixed(1)}k ${code}`;
  return `${converted} ${code}`;
}
