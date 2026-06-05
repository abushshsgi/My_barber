import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import uz from "./locales/uz.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

const STORAGE_KEY = "mysaloon.lang";
const SUPPORTED_LANGS = ["uz", "ru", "en"] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

const getInitialLang = (): AppLang => {
  if (typeof window === "undefined") return "uz";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored as AppLang)) return stored as AppLang;
  } catch {
    /* noop */
  }
  return "uz";
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: getInitialLang(),
    fallbackLng: "uz",
    supportedLngs: [...SUPPORTED_LANGS],
    load: "languageOnly",
    initAsync: false,
    returnEmptyString: false,
    returnNull: false,
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false,
      bindI18n: "languageChanged loaded",
      bindI18nStore: "added removed",
    },
  });
}

export const currentLang = (): AppLang => {
  const raw = i18n.resolvedLanguage || i18n.language || "uz";
  const code = raw.split("-")[0] as AppLang;
  return SUPPORTED_LANGS.includes(code) ? code : "uz";
};

export const setLang = async (lang: AppLang): Promise<void> => {
  await i18n.changeLanguage(lang);
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* noop */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
};

export default i18n;
