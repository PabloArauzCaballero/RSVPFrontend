import { Chip, Stagger, SwitchRow, fonts, useColors } from "@rsvp/ui";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { activeReservationsByItem, catalogedFirst, isGiftListMissing, isGiftUnavailable, unavailableReasonOf, isReservationNotActive, newIdempotencyKey, useApproveExternalGift, useCancelGiftReservation, useAddGiftBatch, useGiftList, useHostReservations, useRejectExternalGift, useGiftSettings, useUpdateGiftSettings, type GiftItem, type GiftReservation } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, useScreenHeader, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { GiftErrorNotice } from "./gift-errors";
import { ReplacementsPanel, ReplacementsToggle, type SwapMutation } from "./replacements-panel";
import { ActionButton, ConfirmDialog, EmptyState, ErrorNotice, Loading, Notice, useStyles } from "../ui";
import { Figure } from "../figures";
import { Row, RowList } from "./offer-row";
import { RetryNotice } from "../guests/parts";
import { useSingleFlightGate } from "../../platform/single-flight";

type ChipTone = "yes" | "maybe" | "wait" | "no";
const STATUS_TONE: Readonly<Record<GiftItem["status"], ChipTone>> = { AVAILABLE: "wait", PROPOSED: "maybe", PENDING_REVIEW: "maybe", COMMITTED: "yes", REJECTED: "no", UNAVAILABLE: "no" };
/** R7 · what the row shows as its status: «No disponible» whenever the provider no longer offers the gift (the wire `status` keeps the value it had; `availability` says it). */
const shownStatus = (item: GiftItem): GiftItem["status"] => (isGiftUnavailable(item) ? "UNAVAILABLE" : item.status);

/** A square monogram: the first letter of the gift on a quiet ground, so every row has a face before it has a photo. */
function Monogram({ title }: { readonly title: string }): ReactNode {
  const palette = useColors();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: palette.text, fontSize: 22, lineHeight: 26, fontWeight: "500", fontFamily: fonts.display }}>{title.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** R7 · the celebration facts the replacements read needs and what the screen does with the outcome of the panel. */
interface SwapContext { readonly celebrationId: string; readonly eventType: string; readonly content: Readonly<Record<string, unknown>>; readonly onSwapped: (oldTitle: string, newTitle: string) => void; readonly onStore: () => void; readonly onGone: () => void; readonly add: SwapMutation }

/** C29 · One gift: a monogram, the title with its origin, the price set apart on the right, the status as a chip and, for a proposal, the two decisions. */
function GiftRow({ item, first, currencyLocale, onApprove, onReject, approving, rejecting, locked, onRelease, releasing, swap }: { readonly item: GiftItem; readonly first: boolean; readonly currencyLocale: ReturnType<typeof useLocale>; readonly onApprove: (id: string) => void; readonly onReject: (item: GiftItem) => void; readonly approving: boolean; readonly rejecting: boolean; readonly locked: boolean; /** D-3 · present when the gift is held by a committed reservation the host can release. */ readonly onRelease?: () => void; readonly releasing?: boolean; /** R7 · what the replacements panel of an unavailable gift needs from the screen. */ readonly swap?: SwapContext }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const t = useT();
  const narrow = useWindowDimensions().width < 520;
  const origin = item.source === "CATALOGED" ? t("gifts.host.list.fromPartner") : t("gifts.host.list.external");
  const price = formatMinor(item.price.amountMinor, item.price.currency, currencyLocale);
  const unavailable = isGiftUnavailable(item);
  const status = shownStatus(item);
  const reason = unavailable ? unavailableReasonOf(item) ?? "unknown" : null;
  const [replacementsOpen, setReplacementsOpen] = useState(false);
  // After a swap the panel closes and its buttons leave: focus goes back to the control that opened it, not to the page.
  const toggleRef = useRef<View>(null);
  const refocus = useRef(false);
  useEffect(() => { if (!replacementsOpen && refocus.current) { refocus.current = false; (toggleRef.current as unknown as { focus?: () => void } | null)?.focus?.(); } }, [replacementsOpen]);
  return (
    <Row first={first} testID={`gift-${item.id}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
        <Monogram title={item.title} />
        <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.muted} numberOfLines={1}>{origin}{narrow ? ` · ${price}` : ""}</Text>
          {(item.quantity ?? 1) > 1 ? <Text style={styles.muted} testID={`gift-quantity-${item.id}`}>{t("gifts.host.wizard.list.quantity", { count: item.quantity ?? 1 })}</Text> : null}
          {item.groupGiftEnabled ? <Text style={styles.muted} testID={`gift-group-${item.id}`}>{t("gifts.host.wizard.list.group")}</Text> : null}
          {reason ? <Text style={styles.body} testID={`gift-unavailable-reason-${item.id}`}>{t(`gifts.host.replacements.reason.${reason}`)}</Text> : null}
          {unavailable ? <Text style={styles.muted} testID={`gift-unavailable-${item.id}`}>{t("gifts.host.list.unavailableNote")}</Text> : null}
          {item.reservedByName ? <Text style={styles.muted} testID={`gift-by-${item.id}`}>{t("gifts.host.list.reservedBy", { name: item.reservedByName })}</Text> : null}
          {narrow ? <View testID={`gift-status-${item.id}`} style={{ alignSelf: "flex-start", paddingTop: spacing[1] }}><Chip tone={STATUS_TONE[status]}>{t(`gifts.host.status.${status}`)}</Chip></View> : null}
        </View>
        {narrow ? null : (
          <View style={{ alignItems: "flex-end", gap: spacing[2] }}>
            <Text style={{ color: palette.text, fontSize: 20, lineHeight: 24, fontWeight: "500", letterSpacing: -0.3, fontFamily: fonts.display, fontVariant: ["tabular-nums"] }}>{price}</Text>
            <View testID={`gift-status-${item.id}`}><Chip tone={STATUS_TONE[status]}>{t(`gifts.host.status.${status}`)}</Chip></View>
          </View>
        )}
      </View>
      {unavailable && swap ? (
        <View style={{ paddingLeft: narrow ? 0 : 48 + spacing[4], gap: spacing[2] }}>
          <ReplacementsToggle toggleRef={toggleRef} item={item} open={replacementsOpen} onToggle={() => setReplacementsOpen((open) => !open)} />
          {replacementsOpen ? <ReplacementsPanel item={item} {...swap} onSwapped={(oldTitle, newTitle) => { refocus.current = true; setReplacementsOpen(false); swap.onSwapped(oldTitle, newTitle); }} /> : null}
        </View>
      ) : null}
      {item.status === "PROPOSED" ? (
        <View style={[styles.row, { paddingLeft: narrow ? 0 : 48 + spacing[4], paddingTop: spacing[2] }]}>
          <ActionButton variant="secondary" label={approving ? t("gifts.host.approvingProposal") : t("gifts.host.approveProposal")} busy={approving} disabled={locked} onPress={() => onApprove(item.id)} testID={`approve-proposal-${item.id}`} />
          <ActionButton icon="close" variant="secondary" label={rejecting ? t("gifts.host.rejectingProposal") : t("gifts.host.rejectProposal")} busy={rejecting} disabled={locked} onPress={() => onReject(item)} testID={`reject-proposal-${item.id}`} />
        </View>
      ) : null}
      {onRelease ? (
        <View style={[styles.row, { paddingLeft: narrow ? 0 : 48 + spacing[4], paddingTop: spacing[2] }]}>
          <ActionButton icon="close" variant="secondary" label={t("gifts.host.release.action")} busy={releasing ?? false} disabled={locked} onPress={onRelease} testID={`release-${item.id}`} />
        </View>
      ) : null}
    </Row>
  );
}

/** The list at a glance: how many gifts, and how many are open, taken, waiting for the host or no longer available (R1). */
function GiftFigures({ items }: { readonly items: readonly GiftItem[] }): ReactNode {
  const t = useT();
  const live = items.filter((item) => item.status !== "REJECTED");
  const available = live.filter((item) => item.status === "AVAILABLE" && !isGiftUnavailable(item)).length;
  const reserved = live.filter((item) => item.status === "COMMITTED").length;
  const review = live.filter((item) => item.status === "PROPOSED" || item.status === "PENDING_REVIEW").length;
  const unavailable = live.filter(isGiftUnavailable).length;
  return (
    <View testID="gift-figures" style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>
      <Figure testID="gift-count" label={t("gifts.host.figures.gifts")} value={live.length} />
      <Figure testID="gift-available" label={t("gifts.host.figures.available")} value={available} />
      <Figure testID="gift-reserved" label={t("gifts.host.figures.reserved")} value={reserved} />
      {review > 0 ? <Figure testID="gift-review" label={t("gifts.host.figures.review")} value={review} /> : null}
      {unavailable > 0 ? <Figure testID="gift-unavailable" label={t("gifts.host.figures.unavailable")} value={unavailable} /> : null}
    </View>
  );
}

/** REQ-F23-06 · who may see who reserved. Guests default to not seeing the name; the host sees it unless they turn it off. */
function RequesterVisibility({ celebrationId }: { readonly celebrationId: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const settings = useGiftSettings(client, celebrationId);
  const update = useUpdateGiftSettings(client, celebrationId);
  if (settings.isPending) return <Loading kind="field" />;
  if (settings.isError) return <RetryNotice error={settings.error} onRetry={() => { void settings.refetch(); }} />;
  const current = settings.data;
  const rows = [
    { key: "showRequesterToHost" as const, label: t("gifts.host.visibility.host"), help: t("gifts.host.visibility.hostHelp") },
    { key: "showRequesterToGuests" as const, label: t("gifts.host.visibility.guests"), help: t("gifts.host.visibility.guestsHelp") }
  ];
  return (
    <View style={{ gap: spacing[3], maxWidth: 720 }}>
      <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("gifts.host.visibility.title")}</Text>
      <Text style={styles.body}>{t("gifts.host.visibility.intro")}</Text>
      {rows.map((row) => (
        <SwitchRow key={row.key} label={row.label} hint={row.help} value={current[row.key]} disabled={update.isPending} testID={`visibility-${row.key}`}
          onChange={() => update.mutate({ showRequesterToHost: current.showRequesterToHost, showRequesterToGuests: current.showRequesterToGuests, [row.key]: !current[row.key] }, { onSuccess: () => { void settings.refetch(); } })} />
      ))}
      {update.isSuccess ? <Notice kind="success">{t("gifts.host.visibility.saved")}</Notice> : null}
      {update.isError ? <ErrorNotice error={update.error} /> : null}
    </View>
  );
}

function GiftsBody({ celebrationId, eventType, content, onNavigate }: { readonly celebrationId: string; readonly eventType: string; readonly content: Readonly<Record<string, unknown>>; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const list = useGiftList(client, celebrationId);
  // The count of reservations waiting is a hint, not the screen: if it cannot be read the list still works.
  const reservations = useHostReservations(client, celebrationId, "PENDING_REVIEW");
  // D-3 · committed reservations, so a reserved gift can be released (the pending ones are decided in Reservas).
  const committed = useHostReservations(client, celebrationId, "COMMITTED");
  const held = activeReservationsByItem(committed.data?.items);
  const release = useCancelGiftReservation(client, celebrationId);
  const [releaseTarget, setReleaseTarget] = useState<{ readonly item: GiftItem; readonly reservation: GiftReservation } | null>(null);
  const [released, setReleased] = useState<string | null>(null);
  const [swapped, setSwapped] = useState<{ readonly oldTitle: string; readonly newTitle: string } | null>(null);
  const releaseKeys = useRef(new Map<string, string>());
  // The swap mutation lives here: its Idempotency-Key per body survives closing and reopening a panel.
  const swapBatch = useAddGiftBatch(client, celebrationId);
  const approve = useApproveExternalGift(client, celebrationId);
  const reject = useRejectExternalGift(client, celebrationId);
  const [rejectTarget, setRejectTarget] = useState<GiftItem | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const locked = approve.isPending || reject.isPending || release.isPending;
  const flight = useSingleFlightGate();
  const go = (path: string) => () => onNavigate(withCelebration(path, celebrationId));
  // «Agregar regalo» is the screen's one action, always in the same place; the people waiting are a message, not a second primary.
  useScreenHeader({ actions: <ActionButton icon="plus" label={t("gifts.host.list.add")} onPress={go(HOST_ROUTES.giftCatalog)} testID="go-add" /> });
  if (list.isPending) return <Loading kind="gifts" />;
  // A celebration that never had a gift gets 404 GIFT_LIST_NOT_FOUND: that is the empty list, not a failure.
  const noListYet = isGiftListMissing(list.error);
  if (list.isError && !noListYet) return <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} />;
  const items = list.data ? catalogedFirst(list.data.items) : [];
  const waiting = reservations.data?.items.filter((entry) => entry.status === "PENDING_REVIEW").length ?? 0;
  return (
    <View style={{ gap: spacing[4] }}>
      {waiting > 0 ? (
        <Notice kind="info">
          <Text style={styles.itemTitle}>{t("gifts.host.list.pending", { count: waiting })}</Text>
          <Text style={styles.body}>{t("gifts.host.list.pendingBody")}</Text>
          <View style={styles.row}><ActionButton icon="arrow" variant="secondary" label={t("gifts.host.list.pendingAction")} onPress={go(HOST_ROUTES.giftInbox)} testID="go-inbox" /></View>
        </Notice>
      ) : null}
      <GiftErrorNotice error={approve.error} onReload={() => { void list.refetch(); }} />
      <GiftErrorNotice error={reject.error} onReload={() => { void list.refetch(); }} />
      {rejected ? <Notice kind="success">{t("gifts.host.proposalRejected", { title: rejected })}</Notice> : null}
      {swapped ? <Notice kind="success"><Text style={styles.body} testID="gift-swapped">{t("gifts.host.replacements.done", { old: swapped.oldTitle, new: swapped.newTitle })}</Text></Notice> : null}
      {released ? <Notice kind="success">{t("gifts.host.release.done", { title: released })}</Notice> : null}
      {release.isError && !releaseTarget ? <GiftErrorNotice error={release.error} onReload={() => { void list.refetch(); }} /> : null}
      {items.length === 0 ? (
        <>
          <EmptyState illustration="noGifts" title={t("gifts.host.list.emptyTitle")} body={t("gifts.host.list.emptyBody")} />
          <RequesterVisibility celebrationId={celebrationId} />
        </>
      ) : (
        <>
          <GiftFigures items={items} />
          {list.data?.deliveryNotes ? <Text style={styles.body} testID="gift-delivery-notes">{t("gifts.host.wizard.list.delivery", { notes: list.data.deliveryNotes })}</Text> : null}
          <RequesterVisibility celebrationId={celebrationId} />
          <RowList>
            <Stagger>{items.map((item, index) => <GiftRow key={item.id} first={index === 0} item={item} currencyLocale={locale} onApprove={(id) => { setRejected(null); reject.reset(); if (flight.begin()) approve.mutate(id, { onSettled: flight.end }); }} onReject={(target) => { setRejected(null); approve.reset(); reject.reset(); setRejectTarget(target); }} approving={approve.isPending && approve.variables === item.id} rejecting={reject.isPending && reject.variables === item.id} locked={locked} swap={{ add: swapBatch, celebrationId, eventType, content, onSwapped: (oldTitle, newTitle) => setSwapped({ oldTitle, newTitle }), onStore: go(HOST_ROUTES.giftCatalog), onGone: () => { void list.refetch(); } }} {...(item.status === "COMMITTED" && held.get(item.id) ? { onRelease: () => { const reservation = held.get(item.id); if (!reservation) return; setReleased(null); release.reset(); setReleaseTarget({ item, reservation }); }, releasing: release.isPending && release.variables?.reservationId === held.get(item.id)?.id } : {})} />)}</Stagger>
          </RowList>
        </>
      )}
      <ConfirmDialog visible={rejectTarget !== null} danger title={t("gifts.host.rejectConfirm.title")} body={rejectTarget ? t("gifts.host.rejectConfirm.body", { title: rejectTarget.title }) : ""} confirmLabel={t("gifts.host.rejectProposal")}
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => { const target = rejectTarget; setRejectTarget(null); if (target && flight.begin()) reject.mutate(target.id, { onSuccess: () => setRejected(target.title), onSettled: flight.end }); }} />
      <ConfirmDialog visible={releaseTarget !== null} danger busy={release.isPending} title={t("gifts.host.release.confirmTitle")} body={releaseTarget ? t("gifts.host.release.confirmBody", { title: releaseTarget.item.title }) : ""}
        confirmLabel={t("gifts.host.release.confirm")} cancelLabel={t("gifts.host.release.keep")} confirmTestID="release-confirm" cancelTestID="release-keep"
        onCancel={() => { setReleaseTarget(null); release.reset(); }}
        onConfirm={() => {
          const target = releaseTarget;
          if (!target || !flight.begin()) return;
          let key = releaseKeys.current.get(target.reservation.id);
          if (!key) { key = newIdempotencyKey(); releaseKeys.current.set(target.reservation.id, key); }
          release.mutate({ reservationId: target.reservation.id, idempotencyKey: key }, {
            onSuccess: () => { setReleaseTarget(null); setReleased(target.item.title); },
            // A reservation somebody already ended is not a failure to keep on screen: close and show the refreshed list.
            onError: (error) => { if (isReservationNotActive(error)) setReleaseTarget(null); },
            onSettled: flight.end
          });
        }}>
        {release.isError && releaseTarget ? <GiftErrorNotice error={release.error} /> : null}
      </ConfirmDialog>
    </View>
  );
}

export function GiftsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.title")} intro={t("gifts.host.intro")}>{({ celebration }) => <GiftsBody celebrationId={celebration.id} eventType={celebration.eventTypeCode} content={celebration.content} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
