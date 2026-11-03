import type { Metadata } from "next";
import { headers } from "next/headers";
import { nativeMagicLink } from "@rsvp/auth";
import { createTranslator } from "@rsvp/i18n/server";
import { requestedLanguage, uiLocale } from "../../../lib/locale";

/** A personal link is private: never indexed, never cached, never shown in a sitemap. */
export const metadata: Metadata = { robots: { index: false, follow: false }, title: "RSVP" };
export const dynamic = "force-dynamic";

/**
 * Web fallback of the universal link `https://<domain>/rsvp/<token>` (REQ-F05-05). If the app is
 * installed the operating system opens it before this page loads; if not, the guest lands here
 * with the same URL. Resolving the token into an invitation needs the Guest service (not built),
 * so the page offers the app and says plainly that the details are not available yet.
 */
export default async function InvitationFallback({ params, searchParams }: { readonly params: Promise<{ token: string }>; readonly searchParams: Promise<{ lang?: string | string[] }> }) {
  const [{ token }, { lang }, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  const t = createTranslator(uiLocale(requestedLanguage(lang, requestHeaders.get("accept-language"))));
  const decoded = safeDecode(token);
  return (
    <main className="rsvp-status">
      <h1>{t("invitation.title")}</h1>
      <p>{t("invitation.body")}</p>
      <p><a className="rsvp-button" href={nativeMagicLink(decoded)}>{t("invitation.openApp")}</a></p>
      <section aria-labelledby="invitation-pending">
        <h2 id="invitation-pending">{t("invitation.pendingTitle")}</h2>
        <p>{t("invitation.pendingBody")}</p>
      </section>
    </main>
  );
}

/** Next already decodes the segment; a stray `%` from a hand-edited link must not crash the page. */
function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}
