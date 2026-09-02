import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ru from "./locales/ru.json";
import uz from "./locales/uz.json";

i18n.use(initReactI18next);

export const LANG_KEY = "mysaloon.lang";
export type AppLang = "uz" | "ru" | "en";

let initPromise: Promise<AppLang> | null = null;

function resolveLang(raw: string | null | undefined): AppLang {
  if (raw === "uz" || raw === "ru" || raw === "en") return raw;
  if (raw?.startsWith("uz")) return "uz";
  if (raw?.startsWith("en")) return "en";
  return "ru";
}

export async function initI18n(lang?: AppLang | null): Promise<AppLang> {
  const stored = lang ?? (await AsyncStorage.getItem(LANG_KEY));
  const resolved = resolveLang(stored);

  if (!i18n.isInitialized) {
    await i18n.init({
      resources: {
        uz: { translation: uz },
        ru: { translation: ru },
        en: { translation: en },
      },
      lng: resolved,
      fallbackLng: "ru",
      supportedLngs: ["uz", "ru", "en"],
      load: "languageOnly",
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
    initPromise = Promise.resolve(resolved);
  } else if (i18n.language !== resolved) {
    await i18n.changeLanguage(resolved);
  }

  return resolved;
}

export async function setAppLanguage(lang: AppLang): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
}

export function currentLang(): AppLang {
  return resolveLang(i18n.resolvedLanguage || i18n.language || "ru");
}

export function ensureI18nInit(): Promise<AppLang> {
  if (initPromise) return initPromise as Promise<AppLang>;
  return initI18n();
}

export default i18n;

if (!i18n.isInitialized) {
  void i18n.init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: "ru",
    fallbackLng: "ru",
    supportedLngs: ["uz", "ru", "en"],
    load: "languageOnly",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}
