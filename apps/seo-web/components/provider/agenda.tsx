'use client';

import { useMemo, useState } from 'react';
import { ApiError } from '@rsvp/api-client';
import { createTranslator, type AppLocale } from '@rsvp/i18n/server';
import { useBookDate, useMonthCalendar, type CalendarDay } from '@rsvp/query-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appUrl } from '../../lib/app-url';
import { createVisitorClient } from '../../lib/visitor-client';
import './provider.css';

export interface AgendaProps { readonly slug: string; readonly providerId: string; readonly providerName: string; readonly timeZone: string; readonly locale: AppLocale; readonly initialMonth: string }

export function Agenda(props: AgendaProps) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 }, mutations: { retry: false } } }));
  return <QueryClientProvider client={client}><AgendaBody {...props} /></QueryClientProvider>;
}

export function shiftMonth(month: string, delta: number): string {
  const [year = 0, mon = 1] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
export const dayState = (day: CalendarDay): 'free' | 'blocked' | 'full' => (day.available ? 'free' : day.reason === 'FULL' ? 'full' : 'blocked');

/** B10 calendar of free days in the PROVIDER's time zone and B11 date request: 422 (blocked day) and 409 (last slot gone) read differently (REQ-F26-05). */
function AgendaBody({ slug, providerId, providerName, timeZone, locale, initialMonth }: AgendaProps) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const api = useMemo(() => createVisitorClient(), []);
  const [month, setMonth] = useState(initialMonth);
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ kind: 'requested' | 'blocked' | 'full' | 'signin' | 'generic'; text: string } | null>(null);
  const calendar = useMonthCalendar(api, providerId, month);
  const book = useBookDate(api, providerId);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
  const dateLabel = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + index))));

  const request = () => {
    if (!picked || book.isPending) return;
    setOutcome(null);
    book.mutate({ date: picked }, {
      onSuccess: (booking) => setOutcome({ kind: 'requested', text: t('agenda.outcome.requestedBody', { date: dateLabel(picked), name: providerName, expires: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(booking.expiresAt)) }) }),
      onError: (error) => {
        const status = error instanceof ApiError ? error.status : 0;
        if (status === 422) setOutcome({ kind: 'blocked', text: t('agenda.outcome.blocked') });
        else if (status === 409) { setOutcome({ kind: 'full', text: t('agenda.outcome.noCapacity') }); setPicked(null); }
        else if (status === 401) setOutcome({ kind: 'signin', text: t('agenda.outcome.signIn') });
        else setOutcome({ kind: 'generic', text: t('agenda.outcome.generic') });
      }
    });
  };

  const days = calendar.data?.days ?? [];
  const lead = days[0] ? days[0].weekday : 0;
  return (
    <main className="directory partner">
      <a href={`/p/${encodeURIComponent(slug)}`}>{providerName}</a>
      <h1>{t('agenda.title', { name: providerName })}</h1>
      <p>{t('agenda.intro', { zone: calendar.data?.timeZone ?? timeZone })}</p>
      <div className="agenda-bar">
        <button type="button" className="rsvp-button rsvp-button--secondary" onClick={() => { setMonth(shiftMonth(month, -1)); setPicked(null); }}>{t('agenda.prev')}</button>
        <h2 aria-live="polite">{monthLabel}</h2>
        <button type="button" className="rsvp-button rsvp-button--secondary" onClick={() => { setMonth(shiftMonth(month, 1)); setPicked(null); }}>{t('agenda.next')}</button>
      </div>
      {calendar.isPending ? <p role="status">{t('agenda.loading')}</p> : null}
      {calendar.isError ? <div role="alert"><p>{t('agenda.error')}</p><button type="button" className="rsvp-button" onClick={() => { void calendar.refetch(); }}>{t('agenda.retry')}</button></div> : null}
      {calendar.data ? (
        <div role="group" aria-label={t('agenda.month', { month: monthLabel })}>
          <ul className="agenda-grid" aria-hidden="true">{weekdays.map((name, index) => <li key={index} className="agenda-head">{name}</li>)}</ul>
          <ul className="agenda-grid" data-testid="agenda-grid">
            {Array.from({ length: lead }, (_, index) => <li key={`pad-${index}`} aria-hidden="true" />)}
            {days.map((day) => {
              const state = dayState(day);
              const label = t('agenda.dayLabel', { date: dateLabel(day.date), state: state === 'free' ? t('agenda.free') : state === 'full' ? t('agenda.full') : t('agenda.blocked') });
              return (
                <li key={day.date}>
                  <button type="button" className="agenda-day" data-state={state} data-date={day.date} aria-label={label} aria-pressed={picked === day.date} aria-disabled={state !== 'free'} title={day.reason ? t(`agenda.reason.${day.reason}`) : undefined}
                    onClick={() => { if (state === 'free') { setPicked(day.date); setOutcome(null); } }}>{Number(day.date.slice(8))}</button>
                </li>
              );
            })}
          </ul>
          <ul className="agenda-legend"><li>{t('agenda.free')}</li><li>{t('agenda.blocked')}</li><li>{t('agenda.full')}</li></ul>
        </div>
      ) : null}
      <div aria-live="polite" data-testid="agenda-outcome">
        {outcome ? <p className={outcome.kind === 'requested' ? 'gifts__notice gifts__notice--ok' : 'gifts__notice gifts__notice--warn'} data-outcome={outcome.kind} role={outcome.kind === 'requested' ? 'status' : 'alert'}>{outcome.kind === 'requested' ? <strong>{t('agenda.outcome.requestedTitle')}. </strong> : null}{outcome.text}{outcome.kind === 'signin' ? <> <a className="rsvp-button" href={appUrl(`/login?returnTo=${encodeURIComponent(`/p/${slug}/agenda`)}`)}>{t('quote.signIn.action')}</a></> : null}</p> : null}
      </div>
      <p>{picked ? t('agenda.selected', { date: dateLabel(picked) }) : t('agenda.select')}</p>
      <div className="rsvp-actions"><button type="button" className="rsvp-button" disabled={!picked || book.isPending} onClick={request}>{book.isPending ? t('agenda.requesting') : t('agenda.request')}</button></div>
    </main>
  );
}
