import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CURRENCY,
  formatMoneyFromUzs,
  isCurrencyCode,
  resolveUzsPerUnit,
  shortMoneyFromUzs,
  type CurrencyCode,
  type CurrencyRatesMap,
} from "@mybarber/shared/currency";
import { fetchCurrencyRates } from "@/lib/api/currency";
import { configurePriceDisplay } from "@/lib/price-display";
import { getPrefsStorageKey } from "@/hooks/use-audience";

const STORAGE_KEY_SUFFIX = "displayCurrency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  rates: CurrencyRatesMap;
  ratesUpdatedAt?: string;
  ratesSource?: string;
  ratesLoading: boolean;
  formatPrice: (amountUzs: number) => string;
  shortPrice: (amountUzs: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStoredCurrency(): CurrencyCode {
  try {
    const raw = localStorage.getItem(getPrefsStorageKey());
    if (!raw) return DEFAULT_CURRENCY;
    const parsed = JSON.parse(raw) as { displayCurrency?: string };
    const code = parsed.displayCurrency;
    return code && isCurrencyCode(code) ? code : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

function writeStoredCurrency(code: CurrencyCode) {
  try {
    const key = getPrefsStorageKey();
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem(key, JSON.stringify({ ...parsed, displayCurrency: code }));
  } catch {
    /* ignore */
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    const stored = readStoredCurrency();
    setCurrencyState(stored);
    configurePriceDisplay(stored, resolveUzsPerUnit(stored, {}));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["currencies", "rates"],
    queryFn: fetchCurrencyRates,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const rates = useMemo(() => {
    const map: CurrencyRatesMap = { UZS: 1 };
    for (const row of data?.currencies ?? []) {
      const n = Number(row.uzs_per_unit);
      if (Number.isFinite(n) && n > 0) map[row.code] = n;
    }
    return map;
  }, [data?.currencies]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    writeStoredCurrency(code);
  }, []);

  const uzsPerUnit = resolveUzsPerUnit(currency, rates);

  useEffect(() => {
    configurePriceDisplay(currency, uzsPerUnit, rates);
  }, [currency, rates, uzsPerUnit]);

  const formatPrice = useCallback(
    (amountUzs: number) => formatMoneyFromUzs(amountUzs, currency, uzsPerUnit),
    [currency, uzsPerUnit],
  );

  const shortPrice = useCallback(
    (amountUzs: number) => shortMoneyFromUzs(amountUzs, currency, uzsPerUnit),
    [currency, uzsPerUnit],
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      rates,
      ratesUpdatedAt: data?.updated_at,
      ratesSource: data?.source,
      ratesLoading: isLoading,
      formatPrice,
      shortPrice,
    }),
    [currency, data?.source, data?.updated_at, formatPrice, isLoading, rates, setCurrency, shortPrice],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}

export function useFormatPrice() {
  return useCurrency().formatPrice;
}

export { STORAGE_KEY_SUFFIX as CURRENCY_PREF_KEY };
