import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { en } from "../i18n/locales/en";
import { de } from "../i18n/locales/de";
import { tr } from "../i18n/locales/tr";
import { es } from "../i18n/locales/es";
import { fr } from "../i18n/locales/fr";
import { zh } from "../i18n/locales/zh";

const resources = {
  en: { translation: en },
  de: { translation: de },
  tr: { translation: tr },
  es: { translation: es },
  fr: { translation: fr },
  zh: { translation: zh },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "de", "tr", "es", "fr", "zh"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "jat.lang",
      caches: ["localStorage"],
    },
  });

export default i18n;

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "tr", label: "Türkçe" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "zh", label: "中文" },
];
