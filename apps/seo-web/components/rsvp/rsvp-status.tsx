'use client';

import { formatCelebrationDate } from '@rsvp/i18n/format';
import type { AppLocale, Translate } from '@rsvp/i18n/server';
import type { GuestCover, HostContact } from '@rsvp/celebration-theme';
import { nearCountdown, type Countdown as CountdownValue, type RsvpState } from '@rsvp/query-hooks';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckMark } from '../brand/check-mark';
import { DeadlineClosedArt, LinkExpiredArt, NoAccessArt, OfflineArt, WelcomeGuestArt } from '../brand/illustrations';

/**
 * The guest's sheet and its states, as the app draws them (`apps/universal/src/guest/{frame,link-states,rsvp-screen}.tsx`):
 * the invitation on the cover (title, who invites, when and where), a rule, then the state or the answer. With a cover the
 * state title is a level-2 heading under the celebration's h1; without one (a link that proves nothing) it is the h1 and no
 * celebration data is shown. Every word comes from `rsvp.invite.*`, the app's keys.
 */

/** Moves keyboard and screen-reader focus to the heading of the state that just appeared. */
export function StateHeading({ children, id, level = 1, className = 'rsvp-heading' }: { children: ReactNode; id?: string; level?: 1 | 2; className?: string }): ReactNode {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: false }); }, []);
  const Tag = level === 1 ? 'h1' : 'h2';
  return <Tag id={id} ref={ref} tabIndex={-1} className={className}>{children}</Tag>;
}

/** The sheet of paper every guest screen sits on, with the invitation on top when the celebration is known. */
export function GuestSheet({ cover, children, labelledBy, quiet = false }: { cover?: GuestCover | undefined; children: ReactNode; labelledBy?: string; quiet?: boolean }): ReactNode {
  return (
    <section className={`rsvp-card guest-sheet${quiet ? ' rsvp-card--quiet' : ''}`} aria-labelledby={labelledBy}>
      {cover ? (
        <>
          <header className="guest-cover">
            <h1 className="guest-cover__title">{cover.heading}</h1>
            {cover.lead ? <p className="guest-cover__lead">{cover.lead}</p> : null}
            {cover.meta ? <p className="guest-cover__meta">{cover.meta}</p> : null}
          </header>
          <hr className="guest-rule" />
        </>
      ) : null}
      <div className="guest-sheet__body">{children}</div>
    </section>
  );
}

/** A gentle dead end (the app's `LinkState`): a drawing, what happened, and the one thing to do next. */
export function GuestState({ id, art, title, body, action, cover, children, alert = false }: { id: string; art: ReactNode; title: string; body?: string; action?: string; cover?: GuestCover | undefined; children?: ReactNode; alert?: boolean }): ReactNode {
  return (
    <GuestSheet cover={cover} labelledBy={id}>
      <div className="rsvp-state" role={alert ? 'alert' : undefined}>
        {art}
        <StateHeading id={id} level={cover ? 2 : 1} className="rsvp-heading rsvp-state__title">{title}</StateHeading>
        {body ? <p className="rsvp-state__body">{body}</p> : null}
        {action ? <p className="rsvp-state__action">{action}</p> : null}
        {children}
      </div>
    </GuestSheet>
  );
}

/** The question of a screen ("¿Nos acompañas?"), a level-2 heading under the celebration. */
export function Question({ id, children }: { id?: string; children: ReactNode }): ReactNode {
  return <StateHeading id={id} level={2} className="guest-question">{children}</StateHeading>;
}

export function LoadingView({ t }: { t: Translate }): ReactNode {
  return (
    <GuestSheet>
      <div className="guest-loading" role="status" aria-live="polite">
        <span className="guest-skeleton" style={{ width: '70%', height: '1.75rem' }} aria-hidden="true" />
        <span className="guest-skeleton" style={{ width: '100%' }} aria-hidden="true" />
        <span className="guest-skeleton" style={{ width: '85%' }} aria-hidden="true" />
        <span className="guest-skeleton-row" aria-hidden="true"><span className="guest-skeleton guest-skeleton--tile" /><span className="guest-skeleton guest-skeleton--tile" /></span>
        <p className="rsvp-hint">{t('rsvp.invite.loading')}</p>
      </div>
    </GuestSheet>
  );
}

/**
 * Token invalid, expired, revoked or unknown celebration: the same screen for every cause, with no
 * title, host, date or any other data of the celebration (REQ-F15-04). Same words and drawing as the app (`InvalidLink`).
 */
export function InvalidView({ t }: { t: Translate }): ReactNode {
  return <GuestState id="rsvp-invalid-title" art={<LinkExpiredArt className="state__art" />} title={t('rsvp.invite.invalidTitle')} body={t('rsvp.invite.invalidBody')} action={t('rsvp.invite.invalidAction')} />;
}

/** Offline, or the service did not answer: what happened and one way out, as the app's `OfflineState`. */
export function LoadFailureView({ kind, t, onRetry }: { kind: 'offline' | 'unavailable'; t: Translate; onRetry: () => void }): ReactNode {
  return (
    <GuestState id="rsvp-failure-title" alert art={<OfflineArt className="state__art" />} title={kind === 'offline' ? t('rsvp.invite.offlineTitle') : t('rsvp.invite.unavailableTitle')} body={kind === 'offline' ? t('rsvp.invite.offlineBody') : t('rsvp.invite.unavailableBody')}>
      <button type="button" className="rsvp-button" onClick={onRetry}>{t('rsvp.invite.retry')}</button>
    </GuestState>
  );
}

/** Public registration is closed for this celebration: the app's `RestrictedNotice`, under the invitation's cover. */
export function RestrictedView({ t, cover, hosts, contact, locale }: { t: Translate; cover: GuestCover; hosts: readonly string[]; contact: HostContact | undefined; locale: AppLocale }): ReactNode {
  return (
    <GuestState id="rsvp-restricted-title" cover={cover} art={<NoAccessArt className="state__art" />} title={t('rsvp.invite.open.restrictedTitle')} body={t('rsvp.invite.open.restrictedBody')}>
      <HostContactLines contact={contact} hosts={hosts} locale={locale} t={t} />
    </GuestState>
  );
}

/** The guest declined on their first answer: a thank-you with a drawing (the app's `welcomeGuest` state). */
export function DeclinedThanks({ t }: { t: Translate }): ReactNode {
  return (
    <div className="rsvp-state">
      <WelcomeGuestArt className="state__art" />
      <StateHeading id="rsvp-title" level={2} className="rsvp-heading rsvp-state__title">{t('rsvp.invite.declinedTitle')}</StateHeading>
      <p className="rsvp-state__body">{t('rsvp.invite.declinedBody')}</p>
    </div>
  );
}

/** A milestone (the app's `Celebrate`): the tick drawn on its pastel disc, a title and a line. Announced politely. */
export function Celebrate({ title, body, id = 'rsvp-title' }: { title: string; body?: string; id?: string }): ReactNode {
  return (
    <div className="guest-celebrate" role="status">
      <CheckMark size={72} className="rsvp-check rsvp-check--lg" />
      <StateHeading id={id} level={2} className="rsvp-heading rsvp-state__title">{title}</StateHeading>
      {body ? <p className="rsvp-state__body">{body}</p> : null}
    </div>
  );
}

/** The countdown, only in the last days (`nearCountdown`): a countdown of weeks is noise next to the deadline line. */
export function Countdown({ deadline, t }: { deadline: string | null; t: Translate }): ReactNode {
  const [left, setLeft] = useState<CountdownValue | null | undefined>(undefined);
  useEffect(() => {
    const tick = () => setLeft(nearCountdown(deadline, Date.now()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  if (!left) return null;
  return <p className="guest-countdown" role="timer" aria-live="off" aria-label={t('rsvp.invite.countdownLabel')}>{t('rsvp.invite.countdown', { days: left.days, hours: left.hours, minutes: left.minutes })}</p>;
}

export function DeadlineLine({ state, locale, t }: { state: RsvpState; locale: AppLocale; t: Translate }): ReactNode {
  if (!state.deadline) return <p className="rsvp-hint">{t('rsvp.invite.deadlineNone')}</p>;
  return <p className="rsvp-hint">{t('rsvp.invite.deadlineOpen', { date: formatCelebrationDate(state.deadline, { locale, timeZone: state.timeZone }), timeZone: state.timeZone })}</p>;
}

const CHIP_TONE = { CONFIRMED: 'yes', DECLINED: 'no', PENDING: 'wait' } as const;

/** The answer on record (the app's `AnswerSummary`): a status chip and the details that apply. */
export function AnswerSummary({ state, locale, t }: { state: RsvpState; locale: AppLocale; t: Translate }): ReactNode {
  const waiting = state.status === 'CONFIRMED' ? Math.max(0, state.requestedCompanions - state.approvedCompanions) : 0;
  return (
    <section className="guest-summary" aria-label={t('rsvp.invite.summaryLabel')}>
      <p className="guest-chip" data-tone={CHIP_TONE[state.status]}>{t(`rsvp.status.${state.status}`)}</p>
      {state.status === 'CONFIRMED' && state.approvedCompanions > 0 ? <p>{t('rsvp.invite.summaryCompanions', { count: state.approvedCompanions })}</p> : null}
      {waiting ? <p>{t('rsvp.invite.summaryPending', { count: waiting })}</p> : null}
      {state.dietaryNotes ? <p>{t('rsvp.invite.summaryDietary', { value: state.dietaryNotes })}</p> : null}
      {state.message ? <p>{t('rsvp.invite.summaryMessage', { value: state.message })}</p> : null}
      {state.updatedAt ? <p className="rsvp-hint">{t('rsvp.invite.summaryUpdated', { date: formatCelebrationDate(state.updatedAt, { locale, timeZone: state.timeZone }) })}</p> : null}
    </section>
  );
}

export interface ClosedInfo { deadline?: string; deadlineLocal?: string; timeZone?: string }

/** "Who to write to": the published `hostContact` of the celebration (only when the hosts consented), else the host names. */
export function HostContactLines({ contact, hosts, locale, t }: { contact?: HostContact | undefined; hosts: readonly string[]; locale: AppLocale; t: Translate }): ReactNode {
  const names = hosts.length ? new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(hosts) : '';
  return (
    <div className="guest-contact">
      <p>{names ? t('rsvp.invite.contact', { hosts: names }) : t('rsvp.invite.contactGeneric')}</p>
      {contact?.email ? <p data-testid="host-contact-email">{t('rsvp.invite.contactEmail')} <a href={`mailto:${contact.email}`}>{contact.email}</a></p> : null}
      {contact?.phone ? <p data-testid="host-contact-phone">{t('rsvp.invite.contactPhone')} <a href={`tel:${contact.phone}`}>{contact.phone}</a></p> : null}
    </div>
  );
}

/** Deadline passed: when it closed, who to write to and the last answer on record (REQ-F15-03), as the app's `Closed`. */
export function ClosedView({ info, state, cover, hosts, contact, locale, t, children }: { info: ClosedInfo; state: RsvpState | null; cover: GuestCover; hosts: readonly string[]; contact?: HostContact | undefined; locale: AppLocale; t: Translate; children?: ReactNode }): ReactNode {
  const deadline = info.deadline ?? state?.deadline ?? undefined;
  const timeZone = info.timeZone ?? state?.timeZone;
  const when = info.deadlineLocal ?? (deadline && timeZone ? formatCelebrationDate(deadline, { locale, timeZone }) : undefined);
  const lead = when && timeZone ? t('rsvp.invite.closedOn', { date: when, timeZone }) : t('rsvp.invite.closedGeneric');
  return (
    <GuestState id="rsvp-closed-title" cover={cover} art={<DeadlineClosedArt className="state__art" />} title={t('rsvp.invite.closedTitle')} body={`${lead} ${t('rsvp.invite.closedHelp')}`}>
      <HostContactLines contact={contact} hosts={hosts} locale={locale} t={t} />
      {state && state.status !== 'PENDING' ? <div className="guest-closed-answer"><p className="rsvp-hint">{t('rsvp.invite.yourAnswer')}</p><AnswerSummary state={state} locale={locale} t={t} /></div> : null}
      {children}
    </GuestState>
  );
}
