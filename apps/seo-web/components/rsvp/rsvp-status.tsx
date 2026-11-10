'use client';

import { formatCelebrationDate } from '@rsvp/i18n/format';
import type { AppLocale, Translate } from '@rsvp/i18n/server';
import type { HostContact } from '@rsvp/celebration-theme';
import { countdownTo, type Countdown as CountdownValue, type RsvpState } from '@rsvp/query-hooks';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Moves keyboard and screen-reader focus to the heading of the state that just appeared. */
export function StateHeading({ children, id }: { children: ReactNode; id?: string }): ReactNode {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: false }); }, []);
  return <h1 id={id} ref={ref} tabIndex={-1} className="rsvp-heading">{children}</h1>;
}

export function LoadingView({ t }: { t: Translate }): ReactNode {
  return <div className="rsvp-loading" role="status" aria-live="polite"><span className="rsvp-spinner" aria-hidden="true" /><p>{t('rsvp.loading')}</p></div>;
}

/**
 * Token invalid, expired, revoked or unknown celebration: the same screen for every cause, with no
 * title, host, date or any other data of the celebration (REQ-F15-04).
 */
export function InvalidView({ t }: { t: Translate }): ReactNode {
  return (
    <section className="rsvp-card rsvp-card--quiet" aria-labelledby="rsvp-invalid-title">
      <StateHeading id="rsvp-invalid-title">{t('rsvp.invalid.title')}</StateHeading>
      <p>{t('rsvp.invalid.body')}</p>
      <p className="rsvp-hint">{t('rsvp.invalid.hint')}</p>
    </section>
  );
}

export function LoadFailureView({ message, t, onRetry }: { message: string; t: Translate; onRetry: () => void }): ReactNode {
  return (
    <section className="rsvp-card rsvp-card--quiet" role="alert">
      <p>{message}</p>
      <button type="button" className="rsvp-button" onClick={onRetry}>{t('rsvp.actions.retry')}</button>
    </section>
  );
}

export function Countdown({ deadline, t }: { deadline: string | null; t: Translate }): ReactNode {
  const [left, setLeft] = useState<CountdownValue | null | undefined>(undefined);
  useEffect(() => {
    const tick = () => setLeft(countdownTo(deadline, Date.now()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  if (!left) return null;
  return <p className="rsvp-countdown" role="timer" aria-live="off" aria-label={t('rsvp.countdown.label')}>{t('rsvp.countdown.value', { days: left.days, hours: left.hours, minutes: left.minutes })}</p>;
}

export function DeadlineLine({ state, locale, t }: { state: RsvpState; locale: AppLocale; t: Translate }): ReactNode {
  if (!state.deadline) return <p>{t('rsvp.deadline.none')}</p>;
  return <p>{t('rsvp.deadline.open', { date: formatCelebrationDate(state.deadline, { locale, timeZone: state.timeZone }), timeZone: state.timeZone })}</p>;
}

/** The answer on record: shown in the confirmed state and, read-only, once the deadline has passed. */
export function AnswerSummary({ state, locale, t }: { state: RsvpState; locale: AppLocale; t: Translate }): ReactNode {
  const waiting = state.status === 'CONFIRMED' ? Math.max(0, state.requestedCompanions - state.approvedCompanions) : 0;
  return (
    <section className="rsvp-summary" aria-label={t('rsvp.summary.label')}>
      <p className="rsvp-status-badge" data-status={state.status}>{t(`rsvp.status.${state.status}`)}</p>
      <ul>
        {state.status === 'CONFIRMED' ? <li>{t('rsvp.summary.companions', { count: state.approvedCompanions })}</li> : null}
        {waiting ? <li>{t('rsvp.summary.pendingCompanions', { count: waiting })}</li> : null}
        {state.dietaryNotes ? <li>{t('rsvp.summary.dietary', { value: state.dietaryNotes })}</li> : null}
        {state.message ? <li>{t('rsvp.summary.message', { value: state.message })}</li> : null}
        {state.updatedAt ? <li>{t('rsvp.summary.updated', { date: formatCelebrationDate(state.updatedAt, { locale, timeZone: state.timeZone }) })}</li> : null}
      </ul>
    </section>
  );
}

export interface ClosedInfo { deadline?: string; deadlineLocal?: string; timeZone?: string }

/** Deadline passed: when it closed, who to write to and the last answer on record (REQ-F15-03). */
/** "Who to write to": the published `hostContact` of the celebration (only when the hosts consented), else the host names. */
export function HostContactLines({ contact, hosts, locale, t }: { contact?: HostContact | undefined; hosts: readonly string[]; locale: AppLocale; t: Translate }): ReactNode {
  const names = hosts.length ? new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(hosts) : '';
  return (
    <>
      <p>{names ? t('rsvp.closed.contact', { hosts: names }) : t('rsvp.closed.contactGeneric')}</p>
      {contact?.email ? <p data-testid="host-contact-email">{t('rsvp.closed.contactEmail')} <a href={`mailto:${contact.email}`}>{contact.email}</a></p> : null}
      {contact?.phone ? <p data-testid="host-contact-phone">{t('rsvp.closed.contactPhone')} <a href={`tel:${contact.phone}`}>{contact.phone}</a></p> : null}
    </>
  );
}

export function ClosedView({ info, state, hosts, contact, locale, t }: { info: ClosedInfo; state: RsvpState | null; hosts: readonly string[]; contact?: HostContact | undefined; locale: AppLocale; t: Translate }): ReactNode {
  const deadline = info.deadline ?? state?.deadline ?? undefined;
  const timeZone = info.timeZone ?? state?.timeZone;
  const when = deadline && timeZone ? formatCelebrationDate(deadline, { locale, timeZone }) : info.deadlineLocal;
  return (
    <section className="rsvp-card" aria-labelledby="rsvp-closed-title">
      <StateHeading id="rsvp-closed-title">{t('rsvp.closed.title')}</StateHeading>
      <p>{when && timeZone ? t('rsvp.closed.closedOn', { date: when, timeZone }) : t('rsvp.closed.closedGeneric')}</p>
      <HostContactLines contact={contact} hosts={hosts} locale={locale} t={t} />
      {state && state.status !== 'PENDING' ? <><p className="rsvp-hint">{t('rsvp.closed.yourAnswer', { status: t(`rsvp.status.${state.status}`) })}</p><AnswerSummary state={state} locale={locale} t={t} /></> : null}
    </section>
  );
}
