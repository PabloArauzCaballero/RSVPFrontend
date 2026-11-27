import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Image, Linking, Platform, Pressable, Text, View, type ScrollView } from "react-native";
import { ApiError } from "@rsvp/api-client";
import type { PublicCelebrationView } from "@rsvp/celebration-theme/model";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { Checkbox, Chip, EmptyState, Illustration, Skeleton, Stagger, SuccessNote, useColors } from "@rsvp/ui";
import { activeReservationsByItem, arrangeGifts, giftContactDestinations, giftListBlocker, isGiftTaken, isReservationNotActive, isReserveRetryable, maxPriceMinor, MESSAGE_MAX, NAME_MAX, newIdempotencyKey, reserveFailureKind, reserveFailureMessage, reserveFieldErrors, useCancelGiftReservation, useCelebrationBySlug, useGiftList, useMyGiftReservations, usePublicListing, useReserveGiftItem, type GiftItem, type GiftReservation, type GiftSourceFilter, type ListingSummary } from "@rsvp/query-hooks";
import { GuestFrame, type GuestFrameProps } from "./frame";
import { LinkState, OfflineState } from "./link-states";
import { ActionButton, ChoiceGroup, ConfirmDialog, Field, Notice, useStyles } from "../host/ui";
import { clearGiftCredential, readGiftCredential, saveGiftCredential } from "./gift-credential";
import { partnerRedirectUrl } from "../platform/partner-link";
import { useApiClient, useLocale, useT } from "../platform/providers";

/**
 * F21-05 · The guest's gift list inside the app (mode Persuade, the optional last step of the journey), and the mirror of the
 * public site's A14/A15: `/c/{slug}/regalos` and the detail `/c/{slug}/regalos/{id}`, with the same filters, order and states.
 * No account: the opaque credential of the invitation link is the Bearer (Gift List 1.2.0 validates it against Guest). It is
 * kept per celebration for this session only (`gift-credential`), so the list opens again without the token in the address.
 * Reserving is one form in the row itself, not a dialog. Partner links always go through `/r/{listingId}`.
 */
type Outcome = { readonly kind: "reserved"; readonly item: GiftItem; readonly status: GiftReservation["status"] } | { readonly kind: "taken"; readonly item: GiftItem };

function GiftWithListing({ item, render }: {
  readonly item: GiftItem;
  readonly render: (item: GiftItem, listing: ListingSummary | undefined) => ReactNode;
}): ReactNode {
  const client = useApiClient();
  const listing = usePublicListing(client, item.source === "CATALOGED" ? item.productListingId ?? undefined : undefined);
  return render(item, listing.isError ? undefined : listing.data);
}

/** Photos are optional public catalog data (a partner product's picture): their failure never prevents viewing or reserving. */
function GiftPhoto({ item, url }: { readonly item: GiftItem; readonly url: string | undefined }): ReactNode {
  const t = useT();
  const [failed, setFailed] = useState<string | null>(null);
  if (!url || url === failed || !isSafeHttps(url)) return null;
  return <Image testID={`gift-photo-${item.id}`} source={{ uri: url }} accessibilityLabel={t("gifts.card.photo", { title: item.title })} onError={() => setFailed(url)} style={{ width: "100%", aspectRatio: 3 / 2, borderRadius: 12 }} resizeMode="cover" accessibilityIgnoresInvertColors />;
}
/** An `https` URL without credentials: the only kind of host-typed link (photo or store) the app opens or loads. */
function isSafeHttps(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

export interface GuestGiftsScreenProps {
  readonly slug: string;
  /** The credential from the personal link, when the address carried it; otherwise the one kept for this celebration. */
  readonly token?: string;
  /** A15 · show only this gift (`/c/{slug}/regalos/{id}`). */
  readonly onlyItemId?: string;
  readonly onNavigate: (path: string) => void;
}

const SOURCES: readonly GiftSourceFilter[] = ["all", "partner", "other"];
const SOURCE_LABEL: Readonly<Record<GiftSourceFilter, string>> = { all: "gifts.filters.sourceAll", partner: "gifts.filters.sourcePartner", other: "gifts.filters.sourceOther" };

export function GuestGiftsScreen({ slug, token, onlyItemId, onNavigate: go }: GuestGiftsScreenProps): ReactNode {
  const styles = useStyles();
  const t = useT();
  const palette = useColors();
  const locale = useLocale();
  const client = useApiClient();
  const [credential, setCredential] = useState<string | null>(() => token || readGiftCredential(slug));
  useEffect(() => { if (token) { saveGiftCredential(slug, token); setCredential(token); } }, [slug, token]);
  const celebration = useCelebrationBySlug<PublicCelebrationView>(client, slug);
  const celebrationId = celebration.data?.celebrationId;
  const list = useGiftList(client, celebrationId, credential);
  const reserve = useReserveGiftItem(client, celebrationId ?? "", credential);
  const [maxPrice, setMaxPrice] = useState("");
  const [source, setSource] = useState<GiftSourceFilter>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const listStatusCode = list.error instanceof ApiError ? list.error.status : 0;
  // An expired or revoked credential is forgotten, so the next visit asks for the link instead of failing again.
  useEffect(() => { if (listStatusCode === 401 && credential) clearGiftCredential(slug); }, [listStatusCode, credential, slug]);
  // A13: the credential is kept for the session, never put back into an address.
  const rsvpPath = `/c/${encodeURIComponent(slug)}/rsvp`;
  const listPath = `/c/${encodeURIComponent(slug)}/regalos`;
  const [target, setTarget] = useState<GiftItem | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof reserveFieldErrors>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  // D-3 · the guest's own reservations: after a reload the page still says "your reservation" and lets them cancel it.
  const mineQuery = useMyGiftReservations(client, celebrationId, credential);
  const mine = activeReservationsByItem(mineQuery.data?.items);
  const cancel = useCancelGiftReservation(client, celebrationId ?? "", credential);
  const [cancelTarget, setCancelTarget] = useState<{ readonly item: GiftItem; readonly reservation: GiftReservation } | null>(null);
  const [cancelled, setCancelled] = useState<string | null>(null);
  const cancelKeys = useRef(new Map<string, string>());

  // REG-01 · the host closed the list by hand: say so and offer no reservation. What the guest already holds stays, and they can still cancel it.
  const listClosed = list.data?.closed === true;
  const scroller = useRef<ScrollView>(null);
  const closedNote = useRef<View>(null);
  // The closure took away the form the guest was filling in (typically a refused tap, far down the list): bring them to the
  // notice and say it. Web moves focus to it (react-native-web does not announce); native announces it to VoiceOver/TalkBack.
  // A list that was already closed when the page opened interrupts nothing.
  useEffect(() => {
    if (!listClosed || !target) return;
    setTarget(null);
    setFieldErrors({});
    scroller.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === "web") (closedNote.current as unknown as HTMLElement | null)?.focus({ preventScroll: true });
    AccessibilityInfo.announceForAccessibility(`${t("gifts.guest.closed.title")}. ${t("gifts.guest.closed.body")}`);
  }, [listClosed, target, t]);

  const all = useMemo(() => list.data?.items ?? [], [list.data]);
  const scoped = onlyItemId ? all.filter((item) => item.id === onlyItemId) : all;
  const maxMinor = maxPriceMinor(maxPrice);
  const { partner, other } = arrangeGifts(scoped, { ...(maxMinor !== undefined ? { maxMinor } : {}), source, onlyAvailable });
  const items = [...partner, ...other];
  const unfiltered = arrangeGifts(scoped, { source: "all", onlyAvailable: false });
  const visibleCount = unfiltered.partner.length + unfiltered.other.length;
  const { partner: altPartner, other: altOther } = arrangeGifts(all.filter((item) => item.id !== outcome?.item.id), { source: "all", onlyAvailable: true });
  const alternatives = [...altPartner, ...altOther].slice(0, 3);
  const filtered = maxMinor !== undefined || source !== "all" || onlyAvailable;

  const keyFor = (itemId: string): string => { let key = keys.current.get(itemId); if (!key) { key = newIdempotencyKey(); keys.current.set(itemId, key); } return key; };
  const open = (item: GiftItem): void => { setOutcome(null); reserve.reset(); setFieldErrors({}); setTarget(item); };
  const askCancel = (item: GiftItem, reservation: GiftReservation): void => { setCancelled(null); cancel.reset(); setCancelTarget({ item, reservation }); };
  const confirmCancel = (): void => {
    if (!cancelTarget || cancel.isPending) return;
    const { item, reservation } = cancelTarget;
    let key = cancelKeys.current.get(reservation.id);
    if (!key) { key = newIdempotencyKey(); cancelKeys.current.set(reservation.id, key); }
    cancel.mutate({ reservationId: reservation.id, idempotencyKey: key }, {
      onSuccess: () => { setCancelTarget(null); setOutcome(null); setCancelled(item.title); },
      onError: (error) => { if (isReservationNotActive(error)) setCancelTarget(null); }
    });
  };
  const submit = (): void => {
    if (!target || listClosed || inFlight.current) return;
    const invalid = reserveFieldErrors({ name, message });
    setFieldErrors(invalid);
    if (invalid.name || invalid.message) return;
    inFlight.current = true;
    const item = target;
    reserve.mutate({ giftItemId: item.id, input: { ...(name.trim() ? { guestDisplayName: name.trim() } : {}), ...(message.trim() ? { message: message.trim() } : {}) }, idempotencyKey: keyFor(item.id) }, {
      onSuccess: (reservation) => { keys.current.delete(item.id); setTarget(null); setName(""); setMessage(""); setOutcome({ kind: "reserved", item, status: reservation.status }); },
      onError: (error) => { if (isGiftTaken(error)) { keys.current.delete(item.id); setTarget(null); setOutcome({ kind: "taken", item }); } },
      onSettled: () => { inFlight.current = false; }
    });
  };

  if (celebration.isPending || (celebrationId && list.isPending)) {
    return (
      // The same ref as the list: this frame's scroller stays mounted, and react-native-web only hands it over when it mounts.
      <GuestFrame scrollRef={scroller}>
        <View accessibilityLiveRegion="polite" style={{ gap: spacing[4] }}>
          {[0, 1, 2].map((n) => <View key={n} style={{ gap: spacing[2], minHeight: 112 }}><Skeleton width="60%" height={18} /><Skeleton width="90%" height={14} /><Skeleton width={140} height={44} radius={12} /></View>)}
          <Text style={styles.muted}>{t("gifts.guest.loading")}</Text>
        </View>
      </GuestFrame>
    );
  }
  if (celebration.isError) {
    const gone = celebration.error instanceof ApiError && celebration.error.status === 404;
    if (!gone) return <OfflineState onRetry={() => { void celebration.refetch(); }} />;
    return <LinkState illustration="notFound" title={t("gifts.guest.error.notFoundTitle")} body={t("gifts.guest.error.notFoundBody")} />;
  }
  const rawTitle = celebration.data.content?.["title"];
  const title = typeof rawTitle === "string" && rawTitle ? rawTitle : slug;
  const detailTitle = onlyItemId ? all.find((item) => item.id === onlyItemId)?.title : undefined;
  const cover: GuestFrameProps = { heading: detailTitle ?? t("gifts.guest.title"), lead: title };
  const listStatus = listStatusCode;
  if (list.isError && listStatus === 401 && !credential) {
    // Opened without the personal link (and none kept for this celebration): there is no anonymous read, so ask for the link.
    return (
      <LinkState illustration="linkExpired" title={t("gifts.error.needLinkTitle")} body={t("gifts.error.needLinkBody")} frame={cover}>
        <ActionButton icon="arrow" label={t("gifts.error.needLinkAction")} onPress={() => go(rsvpPath)} testID="gifts-need-link" />
        <ActionButton icon="back" variant="secondary" label={t("gifts.back")} onPress={() => go(`/c/${encodeURIComponent(slug)}`)} testID="gifts-invitation" />
      </LinkState>
    );
  }
  if (list.isError) {
    const blocker = giftListBlocker(listStatus, list.error instanceof ApiError ? list.error.retryAfterSeconds : undefined, Boolean(credential));
    return (
      <LinkState illustration={blocker.illustration} title={t(blocker.title.key)} body={t(blocker.body.key, blocker.body.params)} frame={cover}>
        {blocker.retryable ? <ActionButton icon="refresh" variant="secondary" label={t("gifts.guest.error.retry")} onPress={() => { void list.refetch(); }} testID="gifts-retry" /> : null}
        <ActionButton icon="back" variant="secondary" label={t("gifts.guest.backToRsvp")} onPress={() => { go(rsvpPath); }} testID="gifts-back" />
      </LinkState>
    );
  }
  const cancelStatus = cancel.error instanceof ApiError ? cancel.error.status : 0;
  const cancelFailure = !cancel.isError ? null : isReservationNotActive(cancel.error) ? null
    : cancelStatus === 401 ? t("gifts.guest.mine.expired") : cancel.error instanceof ApiError ? t("gifts.guest.mine.error") : t("gifts.guest.mine.offline");
  const failedKind = reserve.isError ? reserveFailureKind(reserve.error) : null;
  const retryAfter = reserve.error instanceof ApiError ? reserve.error.retryAfterSeconds : undefined;
  const reserveMessage = failedKind && failedKind !== "taken" ? reserveFailureMessage(failedKind, retryAfter) : null;
  const reservedInList = outcome?.kind === "reserved" && items.some((item) => item.id === outcome.item.id);

  const reservedNote = (reserved: Extract<Outcome, { kind: "reserved" }>): ReactNode => reserved.status === "CANCELLED" ? (
    <Notice kind="error">
      <Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.outcome.cancelledTitle")}</Text>
      <Text style={styles.body}>{t("gifts.outcome.cancelledBody")}</Text>
      <ActionButton icon="back" variant="secondary" label={t("gifts.guest.backToRsvp")} onPress={() => { go(rsvpPath); }} />
    </Notice>
  ) : (
    <View testID="gift-reserved" style={{ gap: spacing[2], alignItems: "center" }}>
      <Illustration name="giftReserved" tone="auto" size="md" />
      <SuccessNote
        message={reserved.status === "COMMITTED" ? t("gifts.guest.done.confirmedTitle") : t("gifts.guest.done.pendingTitle")}
        detail={t(reserved.status === "COMMITTED" ? "gifts.guest.done.confirmedBody" : "gifts.guest.done.pendingBody", { title: reserved.item.title })}
      />
    </View>
  );

  const form = (item: GiftItem): ReactNode => (
    <View style={{ gap: spacing[4], paddingTop: spacing[2] }}>
      <Text accessibilityRole="header" aria-level={3} style={styles.label}>{t("gifts.guest.form.title", { title: item.title })}</Text>
      <Text style={styles.muted}>{t("gifts.guest.form.lead")}</Text>
      <Field label={t("gifts.guest.form.name")} value={name} onChange={(next) => { setName(next); setFieldErrors({}); }} help={t("gifts.guest.form.nameHelp")} error={fieldErrors.name ? t("gifts.guest.reserveError.nameTooLong", { max: NAME_MAX }) : undefined} testID="reserve-name" />
      <Field label={t("gifts.guest.form.message")} value={message} onChange={(next) => { setMessage(next); setFieldErrors({}); }} help={t("gifts.guest.form.messageHelp")} error={fieldErrors.message ? t("gifts.guest.reserveError.messageTooLong", { max: MESSAGE_MAX }) : undefined} multiline testID="reserve-message" />
      {failedKind && failedKind !== "taken" ? (
        <Notice kind="error">
          <Text testID="reserve-error" style={styles.body}>{reserveMessage ? t(reserveMessage.key, reserveMessage.params) : null}</Text>
          {isReserveRetryable(failedKind) ? <Text style={styles.muted}>{t("gifts.guest.reserveError.retryHint")}</Text> : null}
          {failedKind === "attendance" ? <ActionButton icon="back" variant="secondary" label={t("gifts.guest.backToRsvp")} onPress={() => { go(rsvpPath); }} /> : null}
        </Notice>
      ) : null}
      <View style={{ gap: spacing[2] }}>
        <ActionButton label={reserve.isPending ? t("gifts.guest.form.submitting") : t("gifts.guest.form.submit")} busy={reserve.isPending} onPress={submit} testID="reserve-confirm" />
        <ActionButton icon="close" variant="secondary" label={t("gifts.guest.form.cancel")} disabled={reserve.isPending} onPress={() => { setTarget(null); setFieldErrors({}); reserve.reset(); }} testID="reserve-cancel" />
      </View>
    </View>
  );

  const row = (item: GiftItem, listing: ListingSummary | undefined): ReactNode => {
    const listingId = item.productListingId;
    const contact = giftContactDestinations(listing?.destinationTypes);
    const viaOther = !listingId && item.externalUrl && isSafeHttps(item.externalUrl) ? item.externalUrl : null;
    const opened = !listClosed && target?.id === item.id;
    return (
      <View key={item.id} testID={`gift-${item.id}`} style={{ gap: spacing[2], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: palette.border }}>
        <GiftPhoto item={item} url={listing?.imageUrl} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing[3] }}>
          {onlyItemId ? <Text accessibilityRole="header" aria-level={3} style={[styles.subtitle, { flex: 1 }]}>{item.title}</Text> : (
            <Pressable accessibilityRole="link" accessibilityLabel={t("gifts.card.open", { title: item.title })} onPress={() => go(`${listPath}/${encodeURIComponent(item.id)}`)} testID={`open-${item.id}`} style={{ flex: 1, minHeight: 44, justifyContent: "center" }}>
              <Text accessibilityRole="header" aria-level={3} style={[styles.subtitle, { textDecorationLine: "underline" }]}>{item.title}</Text>
            </Pressable>
          )}
          <Text style={[styles.body, { fontWeight: "600", fontVariant: ["tabular-nums"] }]}>{formatMinor(item.price.amountMinor, item.price.currency, locale)}</Text>
        </View>
        {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
        {item.status !== "AVAILABLE" ? <Chip tone={item.status === "PENDING_REVIEW" ? "wait" : "yes"}>{t(`gifts.guest.status.${item.status}`)}</Chip> : null}
        {item.reservedByName ? <Text style={styles.muted} testID={`gift-by-${item.id}`}>{t("gifts.guest.reservedBy", { name: item.reservedByName })}</Text> : null}
        {mine.get(item.id) ? (
          <View testID={`gift-mine-${item.id}`} style={{ gap: spacing[2], alignItems: "flex-start" }}>
            <Text style={[styles.body, { fontWeight: "600" }]}>{mine.get(item.id)?.status === "PENDING_REVIEW" ? t("gifts.guest.mine.pendingLabel") : t("gifts.guest.mine.label")}</Text>
            <ActionButton icon="close" variant="secondary" label={t("gifts.guest.mine.cancel")} disabled={cancel.isPending} onPress={() => { const held = mine.get(item.id); if (held) askCancel(item, held); }} testID={`cancel-reservation-${item.id}`} />
          </View>
        ) : null}
        {outcome?.kind === "reserved" && outcome.item.id === item.id ? reservedNote(outcome) : null}
        {!listClosed && outcome?.kind === "taken" && outcome.item.id === item.id ? (
          <View testID="gift-taken" style={{ gap: spacing[2] }}>
            <Notice kind="error"><Text style={styles.subtitle}>{t("gifts.guest.taken.title")}</Text><Text style={styles.body}>{t("gifts.guest.taken.body", { title: item.title })}</Text></Notice>
            {alternatives.length === 0 ? <Text style={styles.muted}>{t("gifts.guest.taken.none")}</Text> : (
              <View style={{ gap: spacing[1] }}>
                <Text style={styles.label}>{t("gifts.guest.taken.alternatives")}</Text>
                {alternatives.map((alt) => <Pressable key={alt.id} accessibilityRole="button" accessibilityLabel={t("gifts.guest.reserveFor", { title: alt.title })} onPress={() => open(alt)} testID={`alt-${alt.id}`} style={{ minHeight: 44, justifyContent: "center" }}><Text style={[styles.body, { color: palette.primary, fontWeight: "600", textDecorationLine: "underline" }]}>{alt.title}</Text></Pressable>)}
              </View>
            )}
          </View>
        ) : null}
        {opened ? form(item) : (
          <View style={styles.row}>
            {item.status === "AVAILABLE" && !listClosed ? <ActionButton icon="check" label={t("gifts.guest.reserve")} onPress={() => open(item)} testID={`reserve-${item.id}`} /> : null}
            {listingId ? contact.map((destination) => (
              <ActionButton key={destination} icon="arrow" variant="secondary"
                label={t(destination === "WHATSAPP" ? "gifts.card.viaWhatsApp" : "gifts.guest.viaPartner")}
                onPress={() => { void Linking.openURL(partnerRedirectUrl(listingId, { destination, surface: "GIFT_LIST", ...(celebrationId ? { celebrationId } : {}) })); }}
                testID={`${destination === "WHATSAPP" ? "whatsapp" : "partner"}-${item.id}`} />
            )) : null}
            {viaOther ? <ActionButton icon="arrow" variant="secondary" label={t("gifts.card.viaOther")} onPress={() => { void Linking.openURL(viaOther); }} testID={`store-${item.id}`} /> : null}
          </View>
        )}
        {contact.length > 0 && !opened ? <Text style={styles.muted}>{t(onlyItemId ? "gifts.detail.partnerNote" : "gifts.guest.partnerNote")}</Text> : null}
      </View>
    );
  };
  const renderGift = (item: GiftItem) => <GiftWithListing key={item.id} item={item} render={row} />;

  const link = (label: string, path: string, testID: string): ReactNode => (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => go(path)} testID={testID} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
      <Text style={[styles.body, { color: palette.primary, fontWeight: "600", textDecorationLine: "underline" }]}>{label}</Text>
    </Pressable>
  );

  return (
    <GuestFrame {...cover} scrollRef={scroller}>
      {listClosed ? (
        <View ref={closedNote} tabIndex={-1} testID="gift-list-closed">
          <Notice kind="info">
            <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("gifts.guest.closed.title")}</Text>
            <Text style={styles.body}>{t("gifts.guest.closed.body")}</Text>
            {mine.size > 0 ? <Text style={styles.body}>{t("gifts.guest.closed.keepsMine")}</Text> : null}
          </Notice>
        </View>
      ) : null}
      <View style={{ gap: spacing[2] }}>
        {onlyItemId || listClosed ? null : <Text style={styles.body}>{t("gifts.guest.intro")}</Text>}
        {onlyItemId || listClosed ? null : <Text style={styles.muted}>{t("gifts.guest.rule")}</Text>}
        {onlyItemId ? link(t("gifts.detail.back"), listPath, "gifts-list") : null}
        {credential ? link(t("gifts.guest.backToRsvp"), rsvpPath, "gifts-back") : null}
        {link(t("gifts.back"), `/c/${encodeURIComponent(slug)}`, "gifts-invitation")}
      </View>
      {outcome?.kind === "reserved" && !reservedInList ? reservedNote(outcome) : null}
      {cancelled ? <View testID="reservation-cancelled"><SuccessNote message={t("gifts.guest.mine.done", { title: cancelled })} /></View> : null}
      {cancel.isError && isReservationNotActive(cancel.error) ? <Notice kind="info"><Text style={styles.body}>{t("gifts.guest.mine.notActive")}</Text></Notice> : null}
      {list.data && !onlyItemId && visibleCount > 0 ? (
        <View accessibilityRole="search" aria-label={t("gifts.filters.label")} style={{ gap: spacing[3] }} testID="gift-filters">
          <Field label={t("gifts.filters.maxPrice")} value={maxPrice} onChange={setMaxPrice} keyboardType="decimal-pad" testID="filter-max-price" />
          <ChoiceGroup label={t("gifts.filters.source")} value={source} onChange={setSource} choices={SOURCES.map((value) => ({ value, label: t(SOURCE_LABEL[value]) }))} />
          <Checkbox label={t("gifts.filters.onlyAvailable")} value={onlyAvailable} onChange={setOnlyAvailable} />
          {filtered ? <ActionButton icon="close" variant="secondary" label={t("gifts.filters.clear")} onPress={() => { setMaxPrice(""); setSource("all"); setOnlyAvailable(false); }} testID="filter-clear" /> : null}
          <Text accessibilityLiveRegion="polite" role="status" style={styles.muted} testID="gift-count">{t("gifts.filters.count", { count: items.length })}</Text>
        </View>
      ) : null}
      {list.data && onlyItemId && scoped.length === 0 ? <EmptyState illustration="noGifts" title={t("gifts.detail.notFound")} body={t(listClosed ? "gifts.detail.notFoundBodyClosed" : "gifts.detail.notFoundBody")} /> : null}
      {list.data && !onlyItemId && !listClosed && visibleCount === 0 ? <EmptyState illustration="noGifts" title={t("gifts.guest.empty.title")} body={t("gifts.guest.empty.body")} /> : null}
      {list.data && visibleCount > 0 && items.length === 0 ? <EmptyState illustration="emptySearch" title={t("gifts.empty.filtered")} body={t("gifts.empty.filteredBody")} /> : null}
      {partner.length ? <View><Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("gifts.guest.groupPartner")}</Text><Stagger>{partner.map(renderGift)}</Stagger></View> : null}
      {other.length ? <View><Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("gifts.guest.groupOther")}</Text><Stagger>{other.map(renderGift)}</Stagger></View> : null}
      <ConfirmDialog visible={cancelTarget !== null} danger busy={cancel.isPending} title={t("gifts.guest.mine.confirmTitle")} body={cancelTarget ? t(listClosed ? "gifts.guest.mine.confirmBodyClosed" : "gifts.guest.mine.confirmBody", { title: cancelTarget.item.title }) : ""}
        confirmLabel={cancel.isPending ? t("gifts.guest.mine.cancelling") : t("gifts.guest.mine.confirm")} cancelLabel={t("gifts.guest.mine.keep")} confirmTestID="cancel-reservation-confirm" cancelTestID="cancel-reservation-keep"
        onCancel={() => { setCancelTarget(null); cancel.reset(); }} onConfirm={confirmCancel}>
        {cancelFailure ? <Notice kind="error"><Text testID="cancel-reservation-error" style={styles.body}>{cancelFailure}</Text></Notice> : null}
      </ConfirmDialog>
    </GuestFrame>
  );
}
