'use client';

import { useEffect, useMemo } from 'react';
import { createTranslator, resolveLocale } from '@rsvp/i18n/server';
import { OfflineArt } from '../components/brand/illustrations';
import { reportBoundaryError } from '../lib/telemetry';

/**
 * Last-resort boundary for a server render that failed (the backend did not answer). The visitor gets a plain
 * explanation, a retry that re-renders the route, and a way home: never the framework's blank "Application error".
 * The failure is reported once to telemetry (M11).
 */
export default function RouteError({ error, reset }: { readonly error: Error & { digest?: string }; readonly reset: () => void }) {
  const t = useMemo(() => createTranslator(resolveLocale(null, typeof navigator === 'undefined' ? [] : [...navigator.languages])), []);
  useEffect(() => { reportBoundaryError(error, 'route'); }, [error]);
  return (
    <main className="state-page" role="alert">
      <OfflineArt className="state__art" />
      <h1>{t('landing.error.title')}</h1>
      <p>{t('landing.error.body')}</p>
      <div className="state-page__actions">
        <button type="button" className="btn btn--solid" onClick={reset}>{t('landing.error.retry')}</button>
        <a className="textlink" href="/">{t('landing.error.home')}</a>
      </div>
    </main>
  );
}
