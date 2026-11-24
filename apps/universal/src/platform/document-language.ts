import { useEffect } from "react";
import type { AppLocale } from "@rsvp/i18n";

/**
 * Keeps `<html lang>` equal to the language the app is showing (M12): the web boot script sets it before the first paint,
 * and a later choice in Preferences changes it here. Native has no document, so this does nothing there.
 */
export function useDocumentLanguage(locale: AppLocale): void {
  useEffect(() => {
    if (typeof document === "undefined" || !document.documentElement) return;
    document.documentElement.lang = locale;
  }, [locale]);
}
