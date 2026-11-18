import { headers } from 'next/headers';
import { requestedLanguage, uiLocale } from './locale';

export type GuestLanguageParams = Promise<{ readonly lang?: string | string[] }> | undefined;

/** Keep the guest's language across RSVP, gift list and detail pages. */
export async function guestPageLocale(searchParams: GuestLanguageParams) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  return uiLocale(requestedLanguage(params?.lang, requestHeaders.get('accept-language')));
}
