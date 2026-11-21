'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, type ApiClient } from '@rsvp/api-client';
import { createTranslator, formatMinor, type AppLocale } from '@rsvp/i18n/server';
import { activeReservationsByItem, arrangeGifts, giftContactDestinations, isGiftTaken, isReservationNotActive, maxPriceMinor, useCancelGiftReservation, useGiftList, useMyGiftReservations, usePublicListing, useReserveGiftItem, type GiftFilters, type GiftItem, type GiftItemList, type GiftReservation, type GiftSourceFilter, type ListingSummary } from '@rsvp/query-hooks';
import { PartnerLink } from '@rsvp/ui-web';
import { personalLinkPath } from '@rsvp/auth';
import { createGuestClient } from '../../lib/guest-client';
import { clearGuestCredential, readGuestCredential } from '../../lib/guest-credential';
import { GiftProviders } from './gift-providers';
import { ReserveDialog } from './reserve-dialog';
import { CancelReservationDialog } from './cancel-dialog';
import { GiftPhoto } from './gift-photo';
import './gift.css';

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

type Source = GiftSourceFilter;
type Outcome = { readonly kind: 'reserved'; readonly item: GiftItem; readonly status: GiftReservation['status'] } | { readonly kind: 'taken'; readonly item: GiftItem };

function GiftWithListing({ client, item, render }: { readonly client: ApiClient; readonly item: GiftItem; readonly render: (item: GiftItem, listing: ListingSummary | undefined) => ReactNode }) {
  const listing = usePublicListing(client, item.productListingId ?? undefined);
  return render(item, listing.isError ? undefined : listing.data);
}

/** Applies the guest's filters and keeps partner gifts before the others (shared with the app: `arrangeGifts`). */
export const arrange = (items: readonly GiftItem[], filters: GiftFilters): { readonly partner: GiftItem[]; readonly other: GiftItem[] } => arrangeGifts(items, filters);

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
  const reserve = useReserveGiftItem(client, celebrationId, credential ?? null);
  // D-3 · the guest's own reservations (needs the link credential): after a reload the card still offers to cancel.
  const mineQuery = useMyGiftReservations(client, ready ? celebrationId : undefined, credential ?? null);
  const mine = activeReservationsByItem(mineQuery.data?.items);
  const cancel = useCancelGiftReservation(client, celebrationId, credential ?? null);
  const [cancelTarget, setCancelTarget] = useState<{ readonly item: GiftItem; readonly reservation: GiftReservation } | null>(null);
  const [cancelled, setCancelled] = useState<string | null>(null);
  const cancelKeys = useRef(new Map<string, string>());

  const [maxPrice, setMaxPrice] = useState('');
  const [source, setSource] = useState<Source>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [target, setTarget] = useState<GiftItem | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const outcomeRef = useRef<HTMLDivElement>(null);

  const maxMinor = maxPriceMinor(maxPrice);
  const all = list.data?.items ?? [];
  const scoped = onlyItemId ? all.filter((item) => item.id === onlyItemId) : all;
  const { partner, other } = arrange(scoped, { ...(maxMinor !== undefined ? { maxMinor } : {}), source, onlyAvailable });
  const shown = partner.length + other.length;
  const alternatives = arrange(all.filter((item) => item.id !== outcome?.item.id), { source: 'all', onlyAvailable: true });

  useEffect(() => { if (outcome) outcomeRef.current?.focus(); }, [outcome]);

  const keyFor = (itemId: string): string => { let key = keys.current.get(itemId); if (!key) { key = crypto.randomUUID(); keys.current.set(itemId, key); } return key; };

  const submit = (item: GiftItem, input: { guestDisplayName?: string; message?: string }) => {
    if (inFlight.current) return; // anti double click: a ref, because state has not re-rendered yet when the second click lands
    inFlight.current = true;
    reserve.mutate({ giftItemId: item.id, input, idempotencyKey: keyFor(item.id) }, {
      onSuccess: (reservation) => { keys.current.delete(item.id); setTarget(null); setOutcome({ kind: 'reserved', item, status: reservation.status }); },
      onSettled: () => { inFlight.current = false; },
      onError: (error) => { if (isGiftTaken(error)) { keys.current.delete(item.id); setTarget(null); setOutcome({ kind: 'taken', item }); } }
    });
  };

  const confirmCancel = () => {
    if (!cancelTarget || cancel.isPending) return;
    const { item, reservation } = cancelTarget;
    let key = cancelKeys.current.get(reservation.id);
    if (!key) { key = crypto.randomUUID(); cancelKeys.current.set(reservation.id, key); }
    cancel.mutate({ reservationId: reservation.id, idempotencyKey: key }, {
      onSuccess: () => { setCancelTarget(null); setOutcome(null); setCancelled(item.title); },
      onError: (failure) => { if (isReservationNotActive(failure)) setCancelTarget(null); }
    });
  };
  useEffect(() => { if (cancelled) outcomeRef.current?.focus(); }, [cancelled]);

  const error = list.error;
  const status = error instanceof ApiError ? error.status : undefined;
  let blocker: { title: string; body: string; action?: { label: string; href: string }; retry?: boolean } | null = null;
  if (ready && list.isError) {
    if (status === 401 && credential) blocker = { title: t('gifts.error.expiredTitle'), body: t('gifts.error.expiredBody') };
    else if (status === 401) blocker = { title: t('gifts.error.needLinkTitle'), body: t('gifts.error.needLinkBody'), action: { label: t('gifts.error.needLinkAction'), href: `/c/${encodeURIComponent(slug)}/rsvp` } };
    else if (status === 404 && credential) blocker = { title: t('gifts.error.otherTitle'), body: t('gifts.error.otherBody'), action: { label: t('gifts.error.needLinkAction'), href: `/c/${encodeURIComponent(slug)}/rsvp` } };
    else if (status === 429) blocker = { title: t('gifts.error.busyTitle'), body: t('gifts.error.busyBody'), retry: true };
    else if (status === 403) blocker = { title: t('gifts.error.forbiddenTitle'), body: t('gifts.error.forbiddenBody') };
    else blocker = { title: t('gifts.error.unavailableTitle'), body: t('gifts.error.unavailableBody'), retry: true };
  }
  useEffect(() => { if (status === 401 && credential) clearGuestCredential(slug); }, [status, credential, slug]);

  const card = (item: GiftItem, listing: ListingSummary | undefined) => {
    const listingId = item.productListingId;
    const contact = giftContactDestinations(listing?.destinationTypes);
    const taken = item.status === 'COMMITTED';
    return (
      <li key={item.id} className={`gift-card${item.source === 'CATALOGED' ? ' gift-card--partner' : ''}`} data-gift-id={item.id} data-source={item.source}>
        <GiftPhoto item={item} url={listing?.imageUrl} t={t} />
        <span className={`gift-badge${item.status === 'PENDING_REVIEW' ? ' gift-badge--pending' : taken ? ' gift-badge--taken' : ''}`}>{t(`gifts.status.${item.status}`)}</span>
        <h3>{onlyItemId ? item.title : <a href={`/c/${encodeURIComponent(slug)}/regalos/${item.id}?lang=${locale}`} aria-label={t('gifts.card.open', { title: item.title })}>{item.title}</a>}</h3>
        <p className="gift-card__price">{formatMinor(item.price.amountMinor, item.price.currency, locale)}</p>
        {item.reservedByName ? <p className="gift-card__by" data-testid="reserved-by">{t('gifts.card.reservedBy', { name: item.reservedByName })}</p> : null}
        {mine.get(item.id) ? <p className="gift-card__mine" data-testid="my-reservation">{mine.get(item.id)?.status === 'PENDING_REVIEW' ? t('gifts.mine.pendingLabel') : t('gifts.mine.label')}</p> : null}
        {item.description ? <p className="gift-card__desc">{item.description}</p> : null}
        {onlyItemId && contact.length > 0 ? <p className="gift-card__desc">{t('gifts.detail.partnerNote')}</p> : null}
        <div className="gift-card__actions">
          {item.status === 'AVAILABLE' ? <button type="button" className="rsvp-button" onClick={() => { setOutcome(null); setTarget(item); }} aria-label={t('gifts.card.reserveFor', { title: item.title })}>{t('gifts.card.reserve')}</button> : null}
          {mine.get(item.id) ? <button type="button" className="rsvp-button rsvp-button--secondary" disabled={cancel.isPending} onClick={() => { const held = mine.get(item.id); if (held) { setCancelled(null); cancel.reset(); setCancelTarget({ item, reservation: held }); } }} aria-label={t('gifts.mine.cancelFor', { title: item.title })}>{t('gifts.mine.cancel')}</button> : null}
          {listingId ? contact.map((destination) => (
            <PartnerLink key={destination} listingId={listingId} destination={destination} surface="GIFT_LIST" celebrationId={celebrationId}>
              {t(destination === 'WHATSAPP' ? 'gifts.card.viaWhatsApp' : 'gifts.card.viaPartner')}
            </PartnerLink>
          ))
            : item.externalUrl ? <a className="rsvp-button rsvp-button--secondary" href={item.externalUrl} rel="nofollow noopener noreferrer ugc" target="_blank">{t('gifts.card.viaOther')}</a> : null}
        </div>
      </li>
    );
  };
  const renderCard = (item: GiftItem) => <GiftWithListing key={item.id} client={client} item={item} render={card} />;

  return (
    <main className="gifts" aria-busy={!ready || list.isPending}>
      {credential ? <button type="button" className="rsvp-button rsvp-button--secondary" onClick={() => window.location.assign(`${personalLinkPath(slug, credential)}?lang=${locale}`)}>{t('gifts.backToRsvp')}</button> : null}
      <a href={`/c/${encodeURIComponent(slug)}`}>{t('gifts.back')}</a>
      <h1>{onlyItemId && scoped[0] ? scoped[0].title : t('gifts.title')}</h1>
      <p className="gifts__intro">{celebrationTitle} · {t('gifts.intro')}</p>

      <div ref={outcomeRef} tabIndex={-1} role="status" aria-live="polite">
        {outcome?.kind === 'reserved' && outcome.status !== 'CANCELLED' ? (
          <section className="gifts__notice gifts__notice--ok" data-outcome={outcome.status}>
            <h2>{outcome.status === 'COMMITTED' ? t('gifts.outcome.confirmedTitle') : t('gifts.outcome.pendingTitle')}</h2>
            <p>{t(outcome.status === 'COMMITTED' ? 'gifts.outcome.confirmedBody' : 'gifts.outcome.pendingBody', { title: outcome.item.title })}</p>
            <a className="rsvp-button rsvp-button--secondary" href={`/c/${encodeURIComponent(slug)}/regalos?lang=${locale}`}>{t('gifts.outcome.seeList')}</a>
          </section>
        ) : null}
        {outcome?.kind === 'reserved' && outcome.status === 'CANCELLED' ? (
          <section className="gifts__notice gifts__notice--warn" data-outcome="CANCELLED">
            <h2>{t('gifts.outcome.cancelledTitle')}</h2><p>{t('gifts.outcome.cancelledBody')}</p>
            {credential ? <button type="button" className="rsvp-button" onClick={() => window.location.assign(`${personalLinkPath(slug, credential)}?lang=${locale}`)}>{t('gifts.backToRsvp')}</button> : null}
          </section>
        ) : null}
        {cancelled ? (
          <section className="gifts__notice gifts__notice--ok" data-outcome="guest-cancelled"><p>{t('gifts.mine.done', { title: cancelled })}</p></section>
        ) : null}
        {cancel.isError && isReservationNotActive(cancel.error) ? (
          <section className="gifts__notice" data-outcome="not-active"><p>{t('gifts.mine.notActive')}</p></section>
        ) : null}
        {outcome?.kind === 'taken' ? (
          <section className="gifts__notice gifts__notice--warn" data-outcome="taken">
            <h2>{t('gifts.outcome.takenTitle')}</h2>
            <p>{t('gifts.outcome.takenBody', { title: outcome.item.title })}</p>
            {alternatives.partner.length + alternatives.other.length === 0 ? <p>{t('gifts.outcome.takenNone')}</p> : (
              <>
                <h3>{t('gifts.outcome.takenAlternatives')}</h3>
                <ul className="gifts__grid" data-testid="alternatives">{[...alternatives.partner, ...alternatives.other].slice(0, 3).map(renderCard)}</ul>
              </>
            )}
          </section>
        ) : null}
      </div>

      {blocker ? (
        <section className="gifts__notice gifts__notice--warn" role="alert">
          <h2>{blocker.title}</h2><p>{blocker.body}</p>
          {blocker.action ? <a className="rsvp-button" href={blocker.action.href}>{blocker.action.label}</a> : null}
          {blocker.retry ? <button type="button" className="rsvp-button" onClick={() => { void list.refetch(); }}>{t('gifts.error.retry')}</button> : null}
        </section>
      ) : null}

      {!ready || (list.isPending && !blocker) ? <div role="status" aria-label={t('gifts.loading')}><div className="gift-skeleton" /></div> : null}

      {list.data ? (
        <>
          {!onlyItemId ? (
            <form className="gifts__filters" role="search" aria-label={t('gifts.filters.label')} onSubmit={(event) => event.preventDefault()}>
              <label>{t('gifts.filters.maxPrice')}<input type="number" inputMode="decimal" min={0} step="1" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label>
              <label>{t('gifts.filters.source')}
                <select value={source} onChange={(event) => setSource(event.target.value as Source)}>
                  <option value="all">{t('gifts.filters.sourceAll')}</option><option value="partner">{t('gifts.filters.sourcePartner')}</option><option value="other">{t('gifts.filters.sourceOther')}</option>
                </select>
              </label>
              <label className="gifts__check"><input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} />{t('gifts.filters.onlyAvailable')}</label>
              <button type="button" className="rsvp-button rsvp-button--secondary" onClick={() => { setMaxPrice(''); setSource('all'); setOnlyAvailable(false); }}>{t('gifts.filters.clear')}</button>
            </form>
          ) : null}
          {shown === 0 ? (
            <section className="gifts__notice"><h2>{onlyItemId ? t('gifts.detail.notFound') : scoped.length === 0 ? t('gifts.empty.title') : t('gifts.empty.filtered')}</h2>{scoped.length === 0 && !onlyItemId ? <p>{t('gifts.empty.body')}</p> : null}</section>
          ) : (
            <>
              {!onlyItemId ? <p className="gifts__count" role="status">{t('gifts.filters.count', { count: shown })}</p> : null}
              {partner.length ? <section aria-labelledby="gifts-partner"><h2 id="gifts-partner">{t('gifts.group.partner')}</h2><ul className="gifts__grid" data-group="partner">{partner.map(renderCard)}</ul></section> : null}
              {other.length ? <section aria-labelledby="gifts-other"><h2 id="gifts-other">{t('gifts.group.other')}</h2><ul className="gifts__grid" data-group="other">{other.map(renderCard)}</ul></section> : null}
            </>
          )}
        </>
      ) : null}

      <ReserveDialog item={target} t={t} pending={reserve.isPending} error={reserve.error && !isGiftTaken(reserve.error) ? reserve.error : null} onCancel={() => { setTarget(null); reserve.reset(); }} onSubmit={submit} onReviewRsvp={credential ? () => window.location.assign(`${personalLinkPath(slug, credential)}?lang=${locale}`) : undefined} />
      <CancelReservationDialog item={cancelTarget?.item ?? null} t={t} pending={cancel.isPending} error={cancel.error && !isReservationNotActive(cancel.error) ? cancel.error : null} onKeep={() => { setCancelTarget(null); cancel.reset(); }} onConfirm={confirmCancel} />
    </main>
  );
}
