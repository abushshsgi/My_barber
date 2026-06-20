import {
  DEFAULT_CURRENCY,
  formatMoneyFromUzs,
  shortMoneyFromUzs,
  type CurrencyCode,
} from "@mybarber/shared/currency";

let displayCurrency: CurrencyCode = DEFAULT_CURRENCY;
let uzsPerUnit = 1;

export function configurePriceDisplay(currency: CurrencyCode, rate: number) {
  displayCurrency = currency;
  uzsPerUnit = Number.isFinite(rate) && rate > 0 ? rate : 1;
}

export function formatPrice(amountUzs: number): string {
  return formatMoneyFromUzs(amountUzs, displayCurrency, uzsPerUnit);
}

export function shortPrice(amountUzs: number): string {
  return shortMoneyFromUzs(amountUzs, displayCurrency, uzsPerUnit);
}
