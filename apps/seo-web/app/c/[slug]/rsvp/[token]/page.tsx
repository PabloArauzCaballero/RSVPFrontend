import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { RsvpExperience } from '../../../../../components/rsvp/rsvp-experience';
import { requestedLanguage, uiLocale } from '../../../../../lib/locale';
import { siteUrl } from '../../../../../lib/metadata';

/**
 * A12–A10 · Personal RSVP link: https://<domain>/c/{slug}/rsvp/{token}. Private by construction: noindex,
 * no-referrer, never cached, and a generic title (no celebration data until the token is proven valid in the browser).
 */
export const metadata: Metadata = { title: 'RSVP', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' };
export const dynamic = 'force-dynamic';

interface Props { readonly params: Promise<{ slug: string }>; readonly searchParams: Promise<{ lang?: string | string[] }> }

export default async function RsvpTokenPage({ params, searchParams }: Props) {
  const [{ slug }, { lang }, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  const locale = uiLocale(requestedLanguage(lang, requestHeaders.get('accept-language')));
  return <main className="rsvp-shell"><RsvpExperience slug={slug} locale={locale} siteOrigin={siteUrl()} /></main>;
}
