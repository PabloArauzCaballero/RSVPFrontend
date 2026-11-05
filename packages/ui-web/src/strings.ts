import { resources, type AppLocale } from '@rsvp/i18n/server';

/**
 * Primitive copy comes from the shared i18n catalog (`ui.*`, es-BO and en-US). Apps choose the
 * language with `stringsFor(locale)` or override single entries through <UiProvider strings>.
 */
export type UiStrings = { [K in keyof (typeof resources)['es-BO']['ui']]: string };
export const stringsFor = (locale: AppLocale): UiStrings => resources[locale].ui;
export const defaultStrings: UiStrings = stringsFor('es-BO');
