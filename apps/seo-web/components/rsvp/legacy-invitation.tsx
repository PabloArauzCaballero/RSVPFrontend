'use client';

import { nativeMagicLink, personalLinkPath } from '@rsvp/auth';
import { ApiError, type ApiClient } from '@rsvp/api-client';
import { createTranslator, type AppLocale } from '@rsvp/i18n/server';
import { useResolveGuestCredential } from '@rsvp/query-hooks';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, type ReactNode } from 'react';
import { createGuestClient } from '../../lib/guest-client';
import { RsvpProviders } from './rsvp-providers';
import { InvalidView, LoadFailureView, LoadingView } from './rsvp-status';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface Props { readonly locale: AppLocale; readonly token?: string; readonly client?: ApiClient; readonly navigate?: (path: string) => void }

/**
 * Legacy link `/rsvp/{token}`: the opaque credential alone is enough. POST /rsvp/resolve (Bearer, no-store) returns the
 * celebration and its slug and the page moves to the canonical `/c/{slug}/rsvp/{token}`. No `?c=` slug is needed or trusted.
 * The token is never printed as text and never leaves the Authorization header (except the canonical path, which is the link itself).
 */
export function LegacyInvitation(props: Props): ReactNode {
  return <RsvpProviders><Resolver {...props} /></RsvpProviders>;
}

function Resolver({ locale, token: given, client: injected, navigate }: Props): ReactNode {
  const params = useParams<{ token?: string }>();
  const router = useRouter();
  const raw = given ?? params?.token ?? '';
  const token = useMemo(() => { try { return decodeURIComponent(raw); } catch { return raw; } }, [raw]);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const client = useMemo(() => injected ?? createGuestClient(), [injected]);
  const resolved = useResolveGuestCredential(client, token);
  const slug = resolved.data?.slug ?? null;
  const go = navigate ?? ((path: string) => router.replace(path));
  useEffect(() => { if (slug && SLUG.test(slug)) go(personalLinkPath(slug, token)); }, [slug, token]);

  if (resolved.isError) {
    const status = resolved.error instanceof ApiError ? resolved.error.status : 0;
    if (status === 401 || status === 404) return <InvalidView t={t} />;
    return <LoadFailureView t={t} message={t(status === 0 ? 'rsvp.errors.offline' : 'rsvp.errors.unavailable')} onRetry={() => { void resolved.refetch(); }} />;
  }
  if (resolved.isPending || (slug && SLUG.test(slug))) return <LoadingView t={t} />;
  // Valid credential but the celebration's slug is not known yet: the installed app can still open it by id.
  return (
    <section className="rsvp-status">
      <h1>{t('invitation.title')}</h1>
      <p>{t('invitation.body')}</p>
      <p><a className="rsvp-button" href={nativeMagicLink(token)}>{t('invitation.openApp')}</a></p>
      <section aria-labelledby="invitation-pending">
        <h2 id="invitation-pending">{t('invitation.pendingTitle')}</h2>
        <p>{t('invitation.pendingBody')}</p>
      </section>
    </section>
  );
}
