import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ru from "./locales/ru.json";
import uz from "./locales/uz.json";

export const LANG_KEY = "mysaloon.lang";
export type AppLang = "uz" | "ru";

let initPromise: Promise<AppLang> | null = null;

export async function initI18n(lang?: AppLang | null): Promise<AppLang> {
  const stored = lang ?? (await AsyncStorage.getItem(LANG_KEY));
  const resolved: AppLang = stored === "uz" || stored === "ru" ? stored : "ru";

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: {
        uz: { translation: uz },
        ru: { translation: ru },
      },
      lng: resolved,
      fallbackLng: "ru",
      supportedLngs: ["uz", "ru"],
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
  const raw = i18n.resolvedLanguage || i18n.language || "ru";
  return raw.startsWith("uz") ? "uz" : "ru";
}

export function ensureI18nInit(): Promise<AppLang> {
  if (initPromise) return initPromise as Promise<AppLang>;
  return initI18n();
}

export default i18n;
