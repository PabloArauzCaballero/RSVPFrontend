'use client';

import { useEffect, useMemo } from 'react';
import { createTranslator, resolveLocale } from '@rsvp/i18n/server';
import '@rsvp/design-tokens/tokens.css';
import './globals.css';
import { reportBoundaryError } from '../lib/telemetry';

/**
 * M11: the error the root layout itself could not survive (`app/error.tsx` lives inside that layout). Next replaces the
 * whole document with this, so it brings its own `<html>`, language and styles. Same words and actions as the route
 * boundary, in the visitor's language (es-BO when theirs is not offered), and one report to telemetry.
 */
export default function GlobalError({ error, reset }: { readonly error: Error & { digest?: string }; readonly reset: () => void }) {
  const locale = useMemo(() => resolveLocale(null, typeof navigator === 'undefined' ? [] : [...navigator.languages]), []);
  const t = useMemo(() => createTranslator(locale), [locale]);
  useEffect(() => { reportBoundaryError(error, 'global'); }, [error]);
  return (
    <html lang={locale}>
      <body>
        <main className="state-page" role="alert">
          <h1>{t('landing.error.title')}</h1>
          <p>{t('landing.error.body')}</p>
          <div className="state-page__actions">
            <button type="button" className="btn btn--solid" onClick={reset}>{t('landing.error.retry')}</button>
            <a className="textlink" href="/">{t('landing.error.home')}</a>
          </div>
        </main>
      </body>
    </html>
  );
}
