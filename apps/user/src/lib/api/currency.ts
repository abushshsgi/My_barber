import { apiJson } from "./client";

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

export async function fetchCurrencyRates(): Promise<ApiCurrencyRates> {
  return apiJson<ApiCurrencyRates>("/api/v1/currencies/");
}
