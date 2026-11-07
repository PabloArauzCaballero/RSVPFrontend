'use client';

import { CheckMark } from '../brand/check-mark';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '@rsvp/api-client';
import { createTranslator, formatMinor, type AppLocale } from '@rsvp/i18n/server';
import { isFutureDate, quoteSchema, toMinor } from '@rsvp/forms';
import { useQuote, type QuoteReceipt } from '@rsvp/query-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appUrl } from '../../lib/app-url';
import { createVisitorClient, readVisitorToken } from '../../lib/visitor-client';
import { CAPTCHA_SITE_KEY, QuoteCaptcha } from './quote-captcha';
import './provider.css';

export interface QuoteOffer { readonly listingId: string; readonly title: string; readonly priceFrom?: { readonly amountMinor: number; readonly currency: string }; readonly fulfillment?: { readonly responsible: string; readonly coverageZones: readonly string[]; readonly leadTimeDays: number; readonly transportCostMinor?: number } }
export interface QuoteCartProps { readonly slug: string; readonly providerId: string; readonly providerName: string; readonly timeZone: string; readonly offers: readonly QuoteOffer[]; readonly preselected?: string; readonly locale: AppLocale; readonly today: string; /** Identity of each city is its slug: Provider Catalog rejects any other `eventCity` (422 "eventCity must be a city slug"). */ readonly cities: readonly { readonly slug: string; readonly name: string }[] }

export function QuoteCart(props: QuoteCartProps) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { mutations: { retry: false } } }));
  return <QueryClientProvider client={client}><QuoteBody {...props} /></QueryClientProvider>;
}

/** B8 · intent cart (items, date, guests, budget) and B9 · sent confirmation. */
function QuoteBody({ slug, providerId, providerName, offers, preselected, locale, today, cities }: QuoteCartProps) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const api = useMemo(() => createVisitorClient(), []);
  const quote = useQuote(api, providerId, locale);
  const [selected, setSelected] = useState<readonly string[]>(preselected && offers.some((offer) => offer.listingId === preselected) ? [preselected] : []);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [receipt, setReceipt] = useState<QuoteReceipt | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaMissing, setCaptchaMissing] = useState(false);
  const onCaptcha = useCallback((token: string | null) => { setCaptcha(token); if (token) setCaptchaMissing(false); }, []);
  const status = quote.error instanceof ApiError ? quote.error.status : undefined;
  const problem = quote.error instanceof ApiError ? quote.error.problem?.code : undefined;
  const retryAfter = quote.error instanceof ApiError ? quote.error.retryAfterSeconds : undefined;
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => { setSignedIn(readVisitorToken() !== null); }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string): string => String(data.get(name) ?? '');
    const parsed = quoteSchema.safeParse({ listingIds: selected, eventDate: text('eventDate'), guestCount: text('guestCount'), budget: text('budget'), eventCity: text('eventCity'), name: text('name'), email: text('email'), phone: text('phone'), message: text('message') });
    const found: Record<string, string> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) found[String(issue.path[0])] ??= issue.message;
    else if (!isFutureDate(parsed.data.eventDate, today)) found.eventDate = 'date';
    setErrors(found);
    if (!parsed.success || Object.keys(found).length > 0) return;
    if (CAPTCHA_SITE_KEY && !signedIn && !captcha) { setCaptchaMissing(true); return; }
    const v = parsed.data;
    const honeypot = text('website');
    const budgetMinor = toMinor(v.budget ?? '');
    quote.mutate({ listingIds: v.listingIds, eventDate: v.eventDate, guestCount: v.guestCount, ...(budgetMinor !== undefined ? { budgetMinor } : {}), ...(v.eventCity ? { eventCity: v.eventCity } : {}), contact: { name: v.name, email: v.email, ...(v.phone ? { phone: v.phone } : {}) }, ...(v.message ? { message: v.message } : {}), locale, ...(captcha && !signedIn ? { captchaToken: captcha } : {}), ...(honeypot ? { website: honeypot } : {}) }, { onSuccess: setReceipt, onError: () => { if (CAPTCHA_SITE_KEY) setCaptchaReset((count) => count + 1); } });
  };

  const err = (field: string) => (errors[field] ? t(`quote.errors.${errors[field]}`) : null);
  if (receipt) {
    return (
      <main className="directory partner" data-testid="quote-sent">
        <CheckMark size={64} className="sent__check" />
        <h1 tabIndex={-1} ref={(node) => node?.focus()}>{t('quote.sent.title')}</h1>
        <p role="status">{t('quote.sent.body', { name: providerName, id: receipt.id.slice(0, 8) })}</p>
        <p>{t('quote.sent.copy')}</p>
        <p className="partner-disclaimer">{receipt.disclaimer}</p>
        <a className="rsvp-button" href={`/p/${encodeURIComponent(slug)}`}>{t('quote.sent.back')}</a>
      </main>
    );
  }
  const chosen = offers.filter((offer) => selected.includes(offer.listingId));
  return (
    <main className="directory partner">
      <h1>{t('quote.title', { name: providerName })}</h1>
      <p>{t('quote.intro', { name: providerName })}</p>
      <form className="provider-form" onSubmit={submit} noValidate aria-busy={quote.isPending}>
        <fieldset aria-describedby="quote-items-help">
          <legend>{t('quote.items')}</legend>
          <span id="quote-items-help" className="rsvp-hint">{t('quote.itemsHelp')}</span>
          {offers.map((offer) => (
            <label key={offer.listingId} className="quote-item">
              <input type="checkbox" checked={selected.includes(offer.listingId)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, offer.listingId] : current.filter((id) => id !== offer.listingId))} />
              <span><strong>{offer.title}</strong>{offer.priceFrom ? ` · ${t('detail.priceFrom', { price: formatMinor(offer.priceFrom.amountMinor, offer.priceFrom.currency, locale) })}` : ''}</span>
              {offer.fulfillment ? <small>{t('fulfillment.responsibleValue.' + (offer.fulfillment.responsible === 'CUSTOMER' ? 'CUSTOMER' : 'PROVIDER'))} · {offer.fulfillment.coverageZones.join(', ')} · {t('fulfillment.leadTimeValue', { days: offer.fulfillment.leadTimeDays })}</small> : null}
            </label>
          ))}
          {err('listingIds') ? <p className="rsvp-error" role="alert">{err('listingIds')}</p> : null}
        </fieldset>
        <div aria-live="polite" data-testid="quote-summary"><strong>{t('quote.summary')}</strong>: {chosen.length ? chosen.map((offer) => offer.title).join(', ') : t('quote.noneSelected')}</div>
        <Field id="eventDate" label={t('quote.eventDate')} type="date" min={today} error={err('eventDate')} />
        <Field id="guestCount" label={t('quote.guests')} type="number" min={1} inputMode="numeric" error={err('guestCount')} />
        <Field id="budget" label={t('quote.budget')} type="number" min={0} inputMode="decimal" help={t('quote.budgetHelp')} error={err('budget')} />
        <div className="rsvp-field">
          <label htmlFor="eventCity">{t('quote.city')}</label>
          <select id="eventCity" name="eventCity" defaultValue="">
            <option value="">{t('directory.filters.any')}</option>
            {cities.map((city) => <option key={city.slug} value={city.slug}>{city.name}</option>)}
          </select>
        </div>
        <Field id="name" label={t('quote.name')} type="text" autoComplete="name" error={err('name')} />
        <Field id="email" label={t('quote.email')} type="email" autoComplete="email" error={err('email')} />
        <Field id="phone" label={t('quote.phone')} type="tel" autoComplete="tel" />
        <div className="rsvp-field"><label htmlFor="message">{t('quote.message')}</label><textarea id="message" name="message" rows={4} maxLength={2000} /></div>
        <div className="hp-field" aria-hidden="true"><label htmlFor="website">{t('quote.honeypot')}</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
        {signedIn ? null : <p className="rsvp-hint" data-testid="quote-anon-note">{t('quote.anonymousNote')}</p>}
        {CAPTCHA_SITE_KEY && !signedIn ? <QuoteCaptcha onToken={onCaptcha} resetKey={captchaReset} label={t('quote.captcha.label')} /> : null}
        {captchaMissing ? <p className="rsvp-error" role="alert">{t('quote.captcha.required')}</p> : null}
        {status === 401 ? (
          <div role="alert" className="rsvp-card rsvp-card--quiet"><h2>{t('quote.signIn.title')}</h2><p>{t('quote.signIn.body')}</p><a className="rsvp-button" href={appUrl(`/login?returnTo=${encodeURIComponent(`/p/${slug}/cotizar`)}`)}>{t('quote.signIn.action')}</a></div>
        ) : quote.isError ? <p className="rsvp-error" role="alert" data-error={problem ?? status}>{quoteFailure(status, problem, retryAfter, t)}</p> : null}
        <div className="rsvp-actions"><button type="submit" className="rsvp-button" disabled={quote.isPending}>{quote.isPending ? t('quote.submitting') : t('quote.submit')}</button></div>
      </form>
    </main>
  );
}

function Field({ id, label, help, error, ...input }: { readonly id: string; readonly label: string; readonly help?: string; readonly error?: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="rsvp-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} aria-invalid={error ? true : undefined} aria-describedby={[help ? `${id}-help` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined} {...input} />
      {help ? <span id={`${id}-help`} className="rsvp-hint">{help}</span> : null}
      {error ? <span id={`${id}-err`} className="rsvp-error" role="alert">{error}</span> : null}
    </div>
  );
}

/** One message per failure the anonymous path adds: rate limits (with the wait), a failed captcha, a rejected (bot-like) request. */
export function quoteFailure(status: number | undefined, code: string | undefined, retryAfter: number | undefined, t: ReturnType<typeof createTranslator>): string {
  if (status === 429) {
    if (code === 'QUOTE_LIMIT_REACHED') return t('quote.errors.limitContact');
    return retryAfter ? t('quote.errors.rateLimitedWait', { minutes: Math.max(1, Math.ceil(retryAfter / 60)) }) : t('quote.errors.rateLimited');
  }
  if (status === 403) return t('quote.errors.captcha');
  if (status === 422) return code === 'QUOTE_REJECTED' ? t('quote.errors.rejected') : t('quote.errors.validation');
  if (status === 404) return t('quote.errors.notFound');
  return t('quote.errors.generic');
}
