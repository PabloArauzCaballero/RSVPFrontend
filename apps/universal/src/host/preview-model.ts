import type { PublicCelebrationView } from "@rsvp/celebration-theme";
import type { Celebration, TranslatedEventType } from "@rsvp/query-hooks";

/** What the preview needs of a celebration: a saved one, or the draft being typed in the guided sign-up. */
export type PreviewSource = Pick<Celebration, "id" | "slug" | "eventTypeCode" | "defaultLocale" | "supportedLocales" | "timeZone" | "currency" | "templateId" | "content" | "translations" | "publishedAt" | "version"> & {
  readonly localTimes?: Celebration["localTimes"];
  readonly settings?: Pick<Celebration["settings"], "rsvpDeadline">;
};

/**
 * The public page as the theme engine expects it, built from the host's own celebration: the
 * preview renders exactly what guests will see, not an approximation (F12).
 */
export function previewView(celebration: PreviewSource, eventType: TranslatedEventType | undefined, locale?: string): PublicCelebrationView {
  const pageLocale = locale && celebration.supportedLocales.includes(locale) ? locale : celebration.defaultLocale;
  return {
    celebrationId: celebration.id,
    slug: celebration.slug,
    locale: pageLocale,
    availableLocales: celebration.supportedLocales,
    eventType: { code: celebration.eventTypeCode, name: eventType?.name ?? celebration.eventTypeCode, hostRoles: eventType?.hostRoles ?? [] },
    enabledSections: eventType?.enabledSections ?? [],
    timeZone: celebration.timeZone,
    currency: celebration.currency,
    templateId: celebration.templateId,
    content: { ...celebration.content, ...(celebration.translations[pageLocale] ?? {}) },
    localTimes: celebration.localTimes ?? {},
    rsvpDeadline: celebration.settings?.rsvpDeadline ?? null,
    publishedAt: celebration.publishedAt,
    version: celebration.version
  };
}
