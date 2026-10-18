import i18n, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLocale, i18nextResources, type AppLocale } from "./server.js";

export * from "./server.js";

/** React instance (react-i18next) for client apps; server code uses createTranslator from ./server. */
export function createI18n(locale: AppLocale = defaultLocale): I18nInstance {
  const instance = i18n.createInstance();
  void instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: defaultLocale,
    resources: i18nextResources,
    interpolation: { escapeValue: false },
    returnNull: false
  });
  return instance;
}

export * from "./format/index.js";
