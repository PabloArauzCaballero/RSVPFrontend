import type { Metadata } from "next";
import { headers } from "next/headers";
import { LegacyInvitation } from "../../../components/rsvp/legacy-invitation";
import { requestedLanguage, uiLocale } from "../../../lib/locale";

/** A personal link is private: never indexed, never cached, never shown in a sitemap. */
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer", title: "DOne" };
export const dynamic = "force-dynamic";

/**
 * Legacy token-only link `https://<domain>/rsvp/<token>` (the canonical one is `/c/{slug}/rsvp/{token}`). The browser asks
 * POST /rsvp/resolve (guest-rsvp 1.10.0) which celebration the credential belongs to and moves to the canonical page; no `?c=` is needed.
 */
export default async function InvitationFallback({ searchParams }: { readonly params: Promise<{ token: string }>; readonly searchParams: Promise<{ lang?: string | string[] }> }) {
  const [{ lang }, requestHeaders] = await Promise.all([searchParams, headers()]);
  const locale = uiLocale(requestedLanguage(lang, requestHeaders.get("accept-language")));
  return <main className="rsvp-shell"><LegacyInvitation locale={locale} /></main>;
}
