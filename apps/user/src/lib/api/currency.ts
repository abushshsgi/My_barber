import {
  DEFAULT_CURRENCY,
  FALLBACK_UZS_PER_UNIT,
  SUPPORTED_CURRENCY_CODES,
  type CurrencyCode,
} from "@mybarber/shared/currency";
import { apiFetch } from "./client";

export type ApiCurrency = {
  code: string;
  label: string;
  symbol: string;
  uzs_per_unit: string;
};

export type ApiCurrencyRates = {
  base: string;
  updated_at: string;
  rate_date?: string | null;
  source: string;
  currencies: ApiCurrency[];
};

const FALLBACK_LABELS: Record<CurrencyCode, string> = {
  UZS: "O'zbek so'mi",
  USD: "AQSH dollari",
  EUR: "Yevro",
  RUB: "Rossiya rubli",
  KZT: "Qozog'iston tengesi",
  KGS: "Qirg'iz somi",
  TJS: "Tojik somonisi",
  TRY: "Turk lirasi",
  CNY: "Xitoy yuani",
  AED: "BAA dirhami",
};

function buildClientFallbackRates(): ApiCurrencyRates {
  return {
    base: "UZS",
    updated_at: new Date().toISOString(),
    rate_date: null,
    source: "fallback",
    currencies: SUPPORTED_CURRENCY_CODES.map((code) => ({
      code,
      label: FALLBACK_LABELS[code],
      symbol: code === "UZS" ? "so'm" : code,
      uzs_per_unit: String(FALLBACK_UZS_PER_UNIT[code]),
    })),
  };
}

export async function fetchCurrencyRates(): Promise<ApiCurrencyRates> {
  try {
    const res = await apiFetch("/api/v1/currencies/");
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return buildClientFallbackRates();
    }
    if (!body || typeof body !== "object" || !Array.isArray((body as ApiCurrencyRates).currencies)) {
      return buildClientFallbackRates();
    }
    return body as ApiCurrencyRates;
  } catch {
    return buildClientFallbackRates();
  }
}
