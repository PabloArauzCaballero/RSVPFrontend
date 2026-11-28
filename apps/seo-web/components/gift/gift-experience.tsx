'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, type ApiClient } from '@rsvp/api-client';
import { createTranslator, formatMinor, type AppLocale } from '@rsvp/i18n/server';
import {
  activeReservationsByItem, arrangeGifts, giftContactDestinations, giftListBlocker, isGiftTaken, isReservationNotActive, isReserveRetryable, maxPriceMinor, MESSAGE_MAX, NAME_MAX, newIdempotencyKey,
  reserveFailureKind, reserveFailureMessage, reserveFieldErrors, useCancelGiftReservation, leadContextOf, useGiftList, useMyGiftReservations, usePublicListing, useReserveGiftItem,
  type GiftFilters, type GiftItem, type GiftItemList, type GiftReservation, type GiftSourceFilter, type ListingSummary
} from '@rsvp/query-hooks';
import { PartnerLink } from '@rsvp/ui-web';
import { personalLinkPath } from '@rsvp/auth';
import { createGuestClient } from '../../lib/guest-client';
import { clearGuestCredential, readGuestCredential } from '../../lib/guest-credential';
import { GiftProviders } from './gift-providers';
import { CancelReservationDialog } from './cancel-dialog';
import { GiftPhoto } from './gift-photo';
import { CheckMark } from '../brand/check-mark';
import { EmptyArt, GiftReservedArt, LinkExpiredArt, NoAccessArt, NoGiftsArt, OfflineArt } from '../brand/illustrations';
import { GuestSheet, GuestState } from '../rsvp/rsvp-status';
import { TextField } from '../rsvp/rsvp-form';
import './gift.css';

/**
 * A14/A15 · The guest's gift list on the public site, the same as in the app (`apps/universal/src/guest/gifts-screen.tsx`,
 * mode Persuade): «Regalos» on the cover with the celebration under it, the rule, the filters, partner gifts first, and the
 * reservation as a form inside the gift's own row (not a dialog). Words (`gifts.guest.*`), limits and the reading of every
 * failure (`reserveFailureKind`, `giftListBlocker` in `@rsvp/query-hooks`) are the app's. No account: the opaque credential of
 * the invitation link is the Bearer, kept for this tab only (`lib/guest-credential`). Partner links always go through `/r/{listingId}`.
 */

export interface GiftExperienceProps {
  readonly slug: string;
  readonly celebrationId: string;
  readonly celebrationTitle: string;
  readonly locale: AppLocale;
  /** Server-rendered list (cataloged first). Absent when Gift List answered 401 to the anonymous server read. */
  readonly initial?: GiftItemList;
  /** Show only this gift (detail page). */
  readonly onlyItemId?: string;
}

type Outcome = { readonly kind: 'reserved'; readonly item: GiftItem; readonly status: GiftReservation['status'] } | { readonly kind: 'taken'; readonly item: GiftItem };
const SOURCES: readonly GiftSourceFilter[] = ['all', 'partner', 'other'];
const SOURCE_LABEL: Readonly<Record<GiftSourceFilter, string>> = { all: 'gifts.filters.sourceAll', partner: 'gifts.filters.sourcePartner', other: 'gifts.filters.sourceOther' };

function BlockerArt({ art }: { readonly art: 'linkExpired' | 'noAccess' | 'offline' }) {
  if (art === 'noAccess') return <NoAccessArt className="state__art" />;
  if (art === 'offline') return <OfflineArt className="state__art" />;
  return <LinkExpiredArt className="state__art" />;
}

function GiftWithListing({ client, item, render }: {
  readonly client: ApiClient;
  readonly item: GiftItem;
  readonly render: (item: GiftItem, listing: ListingSummary | undefined) => ReactNode;
}) {
  const listing = usePublicListing(client, item.source === 'CATALOGED' ? item.productListingId ?? undefined : undefined);
  return render(item, listing.isError ? undefined : listing.data);
}

/** An `https` URL without credentials: the only kind of host-typed store link the page opens. */
function isSafeHttps(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

/** Applies the guest's filters and keeps partner gifts before the others (shared with the app: `arrangeGifts`). */
export const arrange = (items: readonly GiftItem[], filters: GiftFilters): { readonly partner: GiftItem[]; readonly other: GiftItem[] } => arrangeGifts(items, filters);

/** An inline confirmation that takes focus when it appears (the form it replaces is gone), like the app's `SuccessNote`. */
function FocusNote({ children, testId, tone = 'ok', takeFocus = true }: { readonly children: ReactNode; readonly testId?: string; readonly tone?: 'ok' | 'warn' | 'info'; /** False for a note that is already there when the page opens. */ readonly takeFocus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const focusOnMount = useRef(takeFocus);
  useEffect(() => { if (focusOnMount.current) ref.current?.focus(); }, []);
  return <div ref={ref} tabIndex={-1} role="status" className={`gift-note gift-note--${tone}`} data-testid={testId}>{children}</div>;
}

export function GiftExperience(props: GiftExperienceProps) {
  return <GiftProviders><GiftBody {...props} /></GiftProviders>;
}

function GiftBody({ slug, celebrationId, celebrationTitle, locale, initial, onlyItemId }: GiftExperienceProps) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const client = useMemo(() => createGuestClient(), []);
  const [credential, setCredential] = useState<string | null | undefined>(undefined);
  useEffect(() => { setCredential(readGuestCredential(slug)); }, [slug]);
  const ready = credential !== undefined;
  const list = useGiftList(client, ready ? celebrationId : undefined, credential ?? null, credential ? undefined : initial);
  // R6a: this list is read with the guest's link credential (auth:false), and Gift List answers leadContext null to a guest, so
  // today no ctx is added here. It is wired so a member read (host list, once it shows partner links) uses the same link builder.
  const leadCtx = leadContextOf(list.data);
  const reserve = useReserveGiftItem(client, celebrationId, credential ?? null);
  // D-3 · the guest's own reservations (needs the link credential): after a reload the row still offers to cancel.
  const mineQuery = useMyGiftReservations(client, ready ? celebrationId : undefined, credential ?? null);
  const mine = activeReservationsByItem(mineQuery.data?.items);
  const cancel = useCancelGiftReservation(client, celebrationId, credential ?? null);
  const [cancelTarget, setCancelTarget] = useState<{ readonly item: GiftItem; readonly reservation: GiftReservation } | null>(null);
  const [cancelled, setCancelled] = useState<string | null>(null);
  const cancelKeys = useRef(new Map<string, string>());

  const [maxPrice, setMaxPrice] = useState('');
  const [source, setSource] = useState<GiftSourceFilter>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [target, setTarget] = useState<GiftItem | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof reserveFieldErrors>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const filterId = useId();

  // REG-01 · the host closed the list by hand: say so and offer no reservation. What the guest already holds stays, and they can still cancel it.
  const listClosed = list.data?.closed === true;
  useEffect(() => { if (listClosed) { setTarget(null); setFieldErrors({}); } }, [listClosed]);

  const all = list.data?.items ?? [];
  const scoped = onlyItemId ? all.filter((item) => item.id === onlyItemId) : all;
  const maxMinor = maxPriceMinor(maxPrice);
  const { partner, other } = arrange(scoped, { ...(maxMinor !== undefined ? { maxMinor } : {}), source, onlyAvailable });
  const items = [...partner, ...other];
  const unfiltered = arrange(scoped, { source: 'all', onlyAvailable: false });
  const visibleCount = unfiltered.partner.length + unfiltered.other.length;
  const alternatives = (() => { const { partner: p, other: o } = arrange(all.filter((item) => item.id !== outcome?.item.id), { source: 'all', onlyAvailable: true }); return [...p, ...o].slice(0, 3); })();
  const filtered = maxMinor !== undefined || source !== 'all' || onlyAvailable;

  const rsvpHref = credential ? `${personalLinkPath(slug, credential)}?lang=${locale}` : `/c/${encodeURIComponent(slug)}/rsvp?lang=${locale}`;
  const listHref = `/c/${encodeURIComponent(slug)}/regalos?lang=${locale}`;
  const invitationHref = `/c/${encodeURIComponent(slug)}?lang=${locale}`;

  const keyFor = (itemId: string): string => { let key = keys.current.get(itemId); if (!key) { key = newIdempotencyKey(); keys.current.set(itemId, key); } return key; };
  const open = (item: GiftItem): void => { setOutcome(null); setCancelled(null); reserve.reset(); setFieldErrors({}); setTarget(item); };
  const close = (): void => { setTarget(null); setFieldErrors({}); reserve.reset(); };
  const submit = (): void => {
    if (!target || listClosed || inFlight.current) return; // anti double click: a ref, because state has not re-rendered yet when the second click lands
    const invalid = reserveFieldErrors({ name, message });
    setFieldErrors(invalid);
    if (invalid.name || invalid.message) return;
    inFlight.current = true;
    const item = target;
    reserve.mutate({ giftItemId: item.id, input: { ...(name.trim() ? { guestDisplayName: name.trim() } : {}), ...(message.trim() ? { message: message.trim() } : {}) }, idempotencyKey: keyFor(item.id) }, {
      onSuccess: (reservation) => { keys.current.delete(item.id); setTarget(null); setName(''); setMessage(''); setOutcome({ kind: 'reserved', item, status: reservation.status }); },
      onError: (error) => { if (isGiftTaken(error)) { keys.current.delete(item.id); setTarget(null); setOutcome({ kind: 'taken', item }); } },
      onSettled: () => { inFlight.current = false; }
    });
  };
  const confirmCancel = () => {
    if (!cancelTarget || cancel.isPending) return;
    const { item, reservation } = cancelTarget;
    let key = cancelKeys.current.get(reservation.id);
    if (!key) { key = newIdempotencyKey(); cancelKeys.current.set(reservation.id, key); }
    cancel.mutate({ reservationId: reservation.id, idempotencyKey: key }, {
      onSuccess: () => { setCancelTarget(null); setOutcome(null); setCancelled(item.title); },
      onError: (failure) => { if (isReservationNotActive(failure)) setCancelTarget(null); }
    });
  };

  const listStatus = list.error instanceof ApiError ? list.error.status : 0;
  useEffect(() => { if (listStatus === 401 && credential) clearGuestCredential(slug); }, [listStatus, credential, slug]);

  if (!ready || list.isPending) {
    return (
      <main className="rsvp-shell gifts" aria-busy="true">
        <GuestSheet>
          <div className="guest-loading" role="status" aria-live="polite">
            {[0, 1, 2].map((n) => <span key={n} className="gift-skeleton-row" aria-hidden="true"><span className="guest-skeleton" style={{ width: '60%', height: '1.1rem' }} /><span className="guest-skeleton" style={{ width: '90%' }} /><span className="guest-skeleton" style={{ width: '9rem', height: '2.75rem' }} /></span>)}
            <p className="rsvp-hint">{t('gifts.guest.loading')}</p>
          </div>
        </GuestSheet>
      </main>
    );
  }

  const detailTitle = onlyItemId ? all.find((item) => item.id === onlyItemId)?.title : undefined;
  const cover = { heading: detailTitle ?? t('gifts.guest.title'), lead: celebrationTitle };

  if (list.isError) {
    const blocker = giftListBlocker(listStatus, list.error instanceof ApiError ? list.error.retryAfterSeconds : undefined, Boolean(credential));
    return (
      <main className="rsvp-shell gifts">
        <GuestState id="gifts-blocker-title" alert cover={cover} art={<BlockerArt art={blocker.illustration} />} title={t(blocker.title.key)} body={t(blocker.body.key, blocker.body.params)}>
          <div className="gift-actions gift-actions--stack">
            {blocker.needsLink ? <a className="rsvp-button" href={rsvpHref} data-testid="gifts-need-link">{t('gifts.error.needLinkAction')}</a> : null}
            {blocker.retryable ? <button type="button" className="rsvp-button rsvp-button--secondary" onClick={() => { void list.refetch(); }} data-testid="gifts-retry">{t('gifts.guest.error.retry')}</button> : null}
            {blocker.needsLink ? <a className="rsvp-button rsvp-button--secondary" href={invitationHref}>{t('gifts.back')}</a> : <a className="rsvp-button rsvp-button--secondary" href={rsvpHref} data-testid="gifts-back">{t('gifts.guest.backToRsvp')}</a>}
          </div>
        </GuestState>
      </main>
    );
  }

  const cancelStatus = cancel.error instanceof ApiError ? cancel.error.status : 0;
  const cancelFailure = !cancel.isError || isReservationNotActive(cancel.error) ? null
    : cancelStatus === 401 ? t('gifts.guest.mine.expired') : cancel.error instanceof ApiError ? t('gifts.guest.mine.error') : t('gifts.guest.mine.offline');
  const failedKind = reserve.isError ? reserveFailureKind(reserve.error) : null;
  const reserveMessage = failedKind && failedKind !== 'taken' ? reserveFailureMessage(failedKind, reserve.error instanceof ApiError ? reserve.error.retryAfterSeconds : undefined) : null;
  const reservedInList = outcome?.kind === 'reserved' && items.some((item) => item.id === outcome.item.id);

  const reservedNote = (reserved: Extract<Outcome, { kind: 'reserved' }>): ReactNode => reserved.status === 'CANCELLED' ? (
    <FocusNote tone="warn" testId="gift-cancelled-replay">
      <h3>{t('gifts.outcome.cancelledTitle')}</h3>
      <p>{t('gifts.outcome.cancelledBody')}</p>
      <a className="rsvp-button rsvp-button--secondary" href={rsvpHref}>{t('gifts.guest.backToRsvp')}</a>
    </FocusNote>
  ) : (
    <FocusNote testId="gift-reserved">
      <GiftReservedArt className="state__art gift-note__art" />
      <div className="gift-success">
        <CheckMark size={28} className="gift-success__mark" />
        <div><p className="gift-success__title">{reserved.status === 'COMMITTED' ? t('gifts.guest.done.confirmedTitle') : t('gifts.guest.done.pendingTitle')}</p>
          <p className="rsvp-hint">{t(reserved.status === 'COMMITTED' ? 'gifts.guest.done.confirmedBody' : 'gifts.guest.done.pendingBody', { title: reserved.item.title })}</p></div>
      </div>
    </FocusNote>
  );

  const form = (item: GiftItem): ReactNode => (
    <form className="gift-form" noValidate aria-labelledby={`reserve-${item.id}-title`} onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <h3 id={`reserve-${item.id}-title`} className="gift-form__title">{t('gifts.guest.form.title', { title: item.title })}</h3>
      <p className="rsvp-hint">{t('gifts.guest.form.lead')}</p>
      <TextField label={t('gifts.guest.form.name')} autoComplete="name" value={name} onChange={(next) => { setName(next); setFieldErrors({}); }} help={t('gifts.guest.form.nameHelp')} error={fieldErrors.name ? t('gifts.guest.reserveError.nameTooLong', { max: NAME_MAX }) : undefined} />
      <TextField label={t('gifts.guest.form.message')} multiline value={message} onChange={(next) => { setMessage(next); setFieldErrors({}); }} help={t('gifts.guest.form.messageHelp')} error={fieldErrors.message ? t('gifts.guest.reserveError.messageTooLong', { max: MESSAGE_MAX }) : undefined} />
      {reserveMessage && failedKind ? (
        <div className="rsvp-notice rsvp-notice--error" role="alert">
          <p data-testid="reserve-error">{t(reserveMessage.key, reserveMessage.params)}</p>
          {isReserveRetryable(failedKind) ? <p className="rsvp-hint">{t('gifts.guest.reserveError.retryHint')}</p> : null}
          {failedKind === 'attendance' ? <a className="rsvp-button rsvp-button--secondary" href={rsvpHref}>{t('gifts.guest.backToRsvp')}</a> : null}
        </div>
      ) : null}
      <div className="gift-actions gift-actions--stack">
        <button type="submit" className="rsvp-button" disabled={reserve.isPending} aria-busy={reserve.isPending} data-testid="reserve-confirm">{reserve.isPending ? t('gifts.guest.form.submitting') : t('gifts.guest.form.submit')}</button>
        <button type="button" className="rsvp-button rsvp-button--secondary" disabled={reserve.isPending} onClick={close} data-testid="reserve-cancel">{t('gifts.guest.form.cancel')}</button>
      </div>
    </form>
  );

  const row = (item: GiftItem, listing: ListingSummary | undefined): ReactNode => {
    const listingId = item.productListingId;
    const contact = giftContactDestinations(listing?.destinationTypes);
    const viaOther = !listingId && item.externalUrl && isSafeHttps(item.externalUrl) ? item.externalUrl : null;
    const opened = !listClosed && target?.id === item.id;
    const held = mine.get(item.id);
    return (
      <li key={item.id} className="gift-row" data-gift-id={item.id} data-source={item.source}>
        <GiftPhoto item={item} url={listing?.imageUrl} t={t} />
        <div className="gift-row__head">
          <h3 className="gift-row__title">{onlyItemId ? item.title : <a href={`/c/${encodeURIComponent(slug)}/regalos/${encodeURIComponent(item.id)}?lang=${locale}`} aria-label={t('gifts.card.open', { title: item.title })}>{item.title}</a>}</h3>
          <p className="gift-row__price">{formatMinor(item.price.amountMinor, item.price.currency, locale)}</p>
        </div>
        {item.description ? <p className="rsvp-hint">{item.description}</p> : null}
        {item.status !== 'AVAILABLE' ? <p className="guest-chip" data-tone={item.status === 'PENDING_REVIEW' ? 'wait' : 'yes'}>{t(`gifts.guest.status.${item.status}`)}</p> : null}
        {item.reservedByName ? <p className="rsvp-hint" data-testid="reserved-by">{t('gifts.guest.reservedBy', { name: item.reservedByName })}</p> : null}
        {held ? (
          <div className="gift-mine" data-testid="my-reservation">
            <p>{held.status === 'PENDING_REVIEW' ? t('gifts.guest.mine.pendingLabel') : t('gifts.guest.mine.label')}</p>
            <button type="button" className="rsvp-button rsvp-button--secondary" disabled={cancel.isPending} onClick={() => { setCancelled(null); cancel.reset(); setCancelTarget({ item, reservation: held }); }} aria-label={t('gifts.guest.mine.cancelFor', { title: item.title })}>{t('gifts.guest.mine.cancel')}</button>
          </div>
        ) : null}
        {outcome?.kind === 'reserved' && outcome.item.id === item.id ? reservedNote(outcome) : null}
        {!listClosed && outcome?.kind === 'taken' && outcome.item.id === item.id ? (
          <div className="gift-taken" data-testid="gift-taken">
            <FocusNote tone="warn"><h3>{t('gifts.guest.taken.title')}</h3><p>{t('gifts.guest.taken.body', { title: item.title })}</p></FocusNote>
            {alternatives.length === 0 ? <p className="rsvp-hint">{t('gifts.guest.taken.none')}</p> : (
              <div className="gift-alternatives" data-testid="alternatives">
                <p className="stepper__label">{t('gifts.guest.taken.alternatives')}</p>
                {alternatives.map((alt) => <button key={alt.id} type="button" className="gift-link" onClick={() => open(alt)} aria-label={t('gifts.guest.reserveFor', { title: alt.title })} data-testid={`alt-${alt.id}`}>{alt.title}</button>)}
              </div>
            )}
          </div>
        ) : null}
        {opened ? form(item) : (
          <div className="gift-actions">
            {item.status === 'AVAILABLE' && !listClosed ? <button type="button" className="rsvp-button" onClick={() => open(item)} aria-label={t('gifts.guest.reserveFor', { title: item.title })} data-testid={`reserve-${item.id}`}>{t('gifts.guest.reserve')}</button> : null}
            {listingId ? contact.map((destination) => (
              <PartnerLink key={destination} listingId={listingId} destination={destination} surface="GIFT_LIST" celebrationId={celebrationId} ctx={leadCtx} disclaimer={false} className="gift-partner-link">
                {t(destination === 'WHATSAPP' ? 'gifts.card.viaWhatsApp' : 'gifts.guest.viaPartner')}
              </PartnerLink>
            )) : null}
            {viaOther ? <a className="rsvp-button rsvp-button--secondary" href={viaOther} rel="nofollow noopener noreferrer ugc" target="_blank">{t('gifts.card.viaOther')}</a> : null}
          </div>
        )}
        {contact.length > 0 && !opened ? <p className="rsvp-hint">{t(onlyItemId ? 'gifts.detail.partnerNote' : 'gifts.guest.partnerNote')}</p> : null}
      </li>
    );
  };
  const renderRow = (item: GiftItem) => <GiftWithListing key={item.id} client={client} item={item} render={row} />;

  return (
    <main className="rsvp-shell gifts">
      <GuestSheet cover={cover}>
        <div className="guest-intro">
          {onlyItemId || listClosed ? null : <p>{t('gifts.guest.intro')}</p>}
          {onlyItemId || listClosed ? null : <p className="rsvp-hint">{t('gifts.guest.rule')}</p>}
          <nav className="gift-links" aria-label={t('gifts.guest.title')}>
            {onlyItemId ? <a className="gift-link" href={listHref} data-testid="gifts-list">{t('gifts.detail.back')}</a> : null}
            {credential ? <a className="gift-link" href={rsvpHref} data-testid="gifts-back">{t('gifts.guest.backToRsvp')}</a> : null}
            <a className="gift-link" href={invitationHref} data-testid="gifts-invitation">{t('gifts.back')}</a>
          </nav>
        </div>
        {listClosed ? (
          // A refused tap removes the form that had focus: the note takes it, so the guest sees (and hears) why.
          <FocusNote tone="info" testId="gift-list-closed" takeFocus={target !== null}>
            <h2>{t('gifts.guest.closed.title')}</h2>
            <p>{t('gifts.guest.closed.body')}</p>
            {mine.size > 0 ? <p>{t('gifts.guest.closed.keepsMine')}</p> : null}
          </FocusNote>
        ) : null}
        {outcome?.kind === 'reserved' && !reservedInList ? reservedNote(outcome) : null}
        {cancelled ? <FocusNote testId="reservation-cancelled"><p>{t('gifts.guest.mine.done', { title: cancelled })}</p></FocusNote> : null}
        {cancel.isError && isReservationNotActive(cancel.error) ? <FocusNote tone="info" testId="reservation-not-active"><p>{t('gifts.guest.mine.notActive')}</p></FocusNote> : null}

        {!onlyItemId && visibleCount > 0 ? (
          <form className="gift-filters" role="search" aria-label={t('gifts.filters.label')} onSubmit={(event) => event.preventDefault()} data-testid="gift-filters">
            <div className="rsvp-field">
              <label htmlFor={`${filterId}-max`}>{t('gifts.filters.maxPrice')}</label>
              <input id={`${filterId}-max`} type="text" inputMode="decimal" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
            </div>
            <fieldset className="gift-choice">
              <legend>{t('gifts.filters.source')}</legend>
              <div className="gift-choice__options">
                {SOURCES.map((value) => (
                  <label key={value} className="gift-choice__option">
                    <input type="radio" name={`${filterId}-source`} value={value} checked={source === value} onChange={() => setSource(value)} />
                    <span>{t(SOURCE_LABEL[value])}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="guest-consent"><input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} /><span>{t('gifts.filters.onlyAvailable')}</span></label>
            {filtered ? <button type="button" className="rsvp-button rsvp-button--secondary" onClick={() => { setMaxPrice(''); setSource('all'); setOnlyAvailable(false); }} data-testid="filter-clear">{t('gifts.filters.clear')}</button> : null}
            <p className="gifts__count" role="status" aria-live="polite" data-testid="gift-count">{t('gifts.filters.count', { count: items.length })}</p>
          </form>
        ) : null}

        {onlyItemId && scoped.length === 0 ? <EmptyNote art={<NoGiftsArt className="state__art" />} title={t('gifts.detail.notFound')} body={t(listClosed ? 'gifts.detail.notFoundBodyClosed' : 'gifts.detail.notFoundBody')} /> : null}
        {!onlyItemId && !listClosed && visibleCount === 0 ? <EmptyNote art={<NoGiftsArt className="state__art" />} title={t('gifts.guest.empty.title')} body={t('gifts.guest.empty.body')} /> : null}
        {visibleCount > 0 && items.length === 0 ? <EmptyNote art={<EmptyArt className="state__art" />} title={t('gifts.empty.filtered')} body={t('gifts.empty.filteredBody')} /> : null}
        {partner.length ? <section aria-labelledby="gifts-partner"><h2 id="gifts-partner" className="gift-group">{t('gifts.guest.groupPartner')}</h2><ul className="gift-rows" data-group="partner">{partner.map(renderRow)}</ul></section> : null}
        {other.length ? <section aria-labelledby="gifts-other"><h2 id="gifts-other" className="gift-group">{t('gifts.guest.groupOther')}</h2><ul className="gift-rows" data-group="other">{other.map(renderRow)}</ul></section> : null}
      </GuestSheet>
      <CancelReservationDialog listClosed={listClosed} item={cancelTarget?.item ?? null} t={t} pending={cancel.isPending} failure={cancelFailure} onKeep={() => { setCancelTarget(null); cancel.reset(); }} onConfirm={confirmCancel} />
    </main>
  );
}

/** An empty state with a drawing (the app's `EmptyState`): the list is fine, there is just nothing to show. */
function EmptyNote({ art, title, body }: { readonly art: ReactNode; readonly title: string; readonly body: string }): ReactNode {
  return <div className="rsvp-state gift-empty">{art}<h2 className="rsvp-heading rsvp-state__title">{title}</h2><p className="rsvp-state__body">{body}</p></div>;
}

