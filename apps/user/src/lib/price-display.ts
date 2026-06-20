import {
  DEFAULT_CURRENCY,
  formatMoneyFromUzs,
  resolveUzsPerUnit,
  shortMoneyFromUzs,
  type CurrencyCode,
} from "@mybarber/shared/currency";

let displayCurrency: CurrencyCode = DEFAULT_CURRENCY;
let uzsPerUnit = 1;
let ratesMap: Record<string, number> = { UZS: 1 };

export function configurePriceDisplay(currency: CurrencyCode, rate: number, rates?: Record<string, number>) {
  displayCurrency = currency;
  if (rates) ratesMap = rates;
  uzsPerUnit = resolveUzsPerUnit(currency, rates ?? ratesMap);
}

export function formatPrice(amountUzs: number): string {
  return formatMoneyFromUzs(amountUzs, displayCurrency, uzsPerUnit);
}

export function shortPrice(amountUzs: number): string {
  return shortMoneyFromUzs(amountUzs, displayCurrency, uzsPerUnit);
}
