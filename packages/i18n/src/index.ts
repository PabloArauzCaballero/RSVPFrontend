import i18n, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { enUS } from "../locales/en-US/common.js";
import { esBO } from "../locales/es-BO/common.js";

export type AppLocale = "es-BO" | "en-US";
export const supportedLocales: readonly AppLocale[] = ["es-BO", "en-US"];
export const defaultLocale: AppLocale = "es-BO";

export function resolveLocale(explicit?: string | null, system?: readonly string[]): AppLocale {
  const candidates = [explicit, ...(system ?? [])].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    if (supportedLocales.includes(candidate as AppLocale)) return candidate as AppLocale;
    const language = candidate.split("-")[0];
    const matching = supportedLocales.find((locale) => locale.startsWith(`${language}-`));
    if (matching) return matching;
  }
  return defaultLocale;
}

export function createI18n(locale: AppLocale = defaultLocale): I18nInstance {
  const instance = i18n.createInstance();
  void instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: defaultLocale,
    resources: { "es-BO": { translation: esBO }, "en-US": { translation: enUS } },
    interpolation: { escapeValue: false },
    returnNull: false
  });
  return instance;
}

export * from "./format/index.js";
