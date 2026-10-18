/**
 * Display formatting in the celebration's time zone. The instant is absolute; the zone is
 * always the celebration's, never the device's (REQ-F10-05).
 */

export function formatDate(instant: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone }).format(new Date(instant));
}

export function formatTime(instant: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }).format(new Date(instant));
}

/** Short name of the zone as people read it, e.g. "GMT-4" for La Paz. */
export function zoneLabel(instant: string, timeZone: string, locale: string): string {
  const part = new Intl.DateTimeFormat(locale, { timeZoneName: "short", timeZone }).formatToParts(new Date(instant)).find((item) => item.type === "timeZoneName");
  return part?.value ?? timeZone;
}
