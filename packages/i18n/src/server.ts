import i18n from "i18next";
import { enUS as enUSCommon } from "../locales/en-US/common.js";
import { esBO as esBOCommon } from "../locales/es-BO/common.js";
import { celebrationEnUS } from "../locales/en-US/celebration.js";
import { celebrationEsBO } from "../locales/es-BO/celebration.js";
import { directoryEnUS } from "../locales/en-US/directory.js";
import { directoryEsBO } from "../locales/es-BO/directory.js";
import { hostEnUS } from "../locales/en-US/host.js";
import { hostEsBO } from "../locales/es-BO/host.js";
import { adminEnUS } from "../locales/en-US/admin.js";
import { adminEsBO } from "../locales/es-BO/admin.js";

/**
 * React-free entry (`@rsvp/i18n/server`): resources, locale resolution and a synchronous
 * translator. Safe in Next.js server components, where react-i18next cannot load.
 */

const esBO = { ...esBOCommon, celebration: celebrationEsBO, directory: directoryEsBO, host: hostEsBO, admin: adminEsBO };
const enUS = { ...enUSCommon, celebration: celebrationEnUS, directory: directoryEnUS, host: hostEnUS, admin: adminEnUS };

/** Every resource, by locale; tests compare their key sets. */
export const resources = { "es-BO": esBO, "en-US": enUS } as const;
export const i18nextResources = { "es-BO": { translation: esBO }, "en-US": { translation: enUS } } as const;

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

export type Translate = (key: string, values?: Readonly<Record<string, string | number>>) => string;

const translators = new Map<AppLocale, Translate>();

/** A synchronous `t`. Instances are cached per locale; resources are bundled, so nothing loads at runtime. */
export function createTranslator(locale: AppLocale): Translate {
  const cached = translators.get(locale);
  if (cached) return cached;
  const instance = i18n.createInstance();
  void instance.init({ lng: locale, fallbackLng: defaultLocale, resources: i18nextResources, interpolation: { escapeValue: false }, returnNull: false, initAsync: false });
  const translate: Translate = (key, values) => instance.t(key, values ?? {});
  translators.set(locale, translate);
  return translate;
}
