import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import uz from "./locales/uz.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

const STORAGE_KEY = "mysaloon.lang";

const getInitialLang = (): string => {
  if (typeof window === "undefined") return "uz";
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "uz";
  } catch {
    return "uz";
  }
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
    interpolation: { escapeValue: false },
  });
}

export const setLang = (lang: "uz" | "ru" | "en") => {
  i18n.changeLanguage(lang);
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* noop */
  }
};

export default i18n;
