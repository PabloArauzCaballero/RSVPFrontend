import { Chip, Stagger, SwitchRow, fonts, useColors } from "@rsvp/ui";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { activeReservationsByItem, catalogedFirst, createBodyKeys, isGiftListMissing, isGiftUnavailable, unavailableReasonOf, isReservationNotActive, newIdempotencyKey, problemCode, useApproveExternalGift, useCancelGiftReservation, useAddGiftBatch, useGiftList, useHostReservations, useRejectExternalGift, useRemoveGiftItem, useGiftSettings, useUpdateGiftSettings, type GiftItem, type GiftReservation } from "@rsvp/query-hooks";
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
type ShownStatus = GiftItem["status"] | "UNAVAILABLE";
const STATUS_TONE: Readonly<Record<ShownStatus, ChipTone>> = { AVAILABLE: "wait", PROPOSED: "maybe", PENDING_REVIEW: "maybe", COMMITTED: "yes", REJECTED: "no", UNAVAILABLE: "no" };
/** R7 · the chip says «No disponible» from `availability` (gift-list 1.14.0), never from `status`, which keeps the value the gift had. */
const shownStatus = (item: GiftItem): ShownStatus => (isGiftUnavailable(item) ? "UNAVAILABLE" : item.status);

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
interface SwapContext { readonly celebrationId: string; readonly eventType: string; readonly content: Readonly<Record<string, unknown>>; readonly onSwapped: (oldTitle: string, newTitle: string) => void; readonly onStore: () => void; readonly onGone: () => void; readonly add: SwapMutation; readonly owner: string | null; readonly onOwner: (itemId: string) => void }

/** C29 · One gift: a monogram, the title with its origin, the price set apart on the right, the status as a chip and, for a proposal, the two decisions. */
function GiftRow({ item, first, currencyLocale, onApprove, onReject, approving, rejecting, locked, onRelease, releasing, swap, onRemove, removing }: { readonly item: GiftItem; readonly first: boolean; readonly currencyLocale: ReturnType<typeof useLocale>; readonly onApprove: (id: string) => void; readonly onReject: (item: GiftItem) => void; readonly approving: boolean; readonly rejecting: boolean; readonly locked: boolean; /** D-3 · present when the gift is held by a committed reservation the host can release. */ readonly onRelease?: () => void; readonly releasing?: boolean; /** R7 · what the replacements panel of an unavailable gift needs from the screen. */ readonly swap?: SwapContext; /** Gift 1.20.0 · present while the gift is «No disponible»: the host takes it off the list. */ readonly onRemove?: () => void; readonly removing?: boolean }): ReactNode {
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
      {unavailable && onRemove ? (
        <View style={[styles.row, { paddingLeft: narrow ? 0 : 48 + spacing[4], paddingTop: spacing[2] }]}>
          <ActionButton icon="close" variant="secondary" label={t("gifts.host.remove.action")} accessibilityLabel={t("gifts.host.remove.actionFor", { title: item.title })} busy={removing ?? false} disabled={locked} onPress={onRemove} testID={`remove-gift-${item.id}`} />
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

/** The list at a glance: how many gifts can still be given, and how many are open, taken or waiting for the host. The unavailable ones are not in these totals (R1): they have their own section. */
function GiftFigures({ items }: { readonly items: readonly GiftItem[] }): ReactNode {
  const t = useT();
  const live = items.filter((item) => item.status !== "REJECTED");
  const available = live.filter((item) => item.status === "AVAILABLE" && !isGiftUnavailable(item)).length;
  const reserved = live.filter((item) => item.status === "COMMITTED").length;
  const review = live.filter((item) => item.status === "PROPOSED" || item.status === "PENDING_REVIEW").length;
  return (
    <View testID="gift-figures" style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>
      <Figure testID="gift-count" label={t("gifts.host.figures.gifts")} value={live.length} />
      <Figure testID="gift-available" label={t("gifts.host.figures.available")} value={available} />
      <Figure testID="gift-reserved" label={t("gifts.host.figures.reserved")} value={reserved} />
      {review > 0 ? <Figure testID="gift-review" label={t("gifts.host.figures.review")} value={review} /> : null}
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
  const [released, setReleased] = useState<GiftItem | null>(null);
  const [swapped, setSwapped] = useState<{ readonly oldTitle: string; readonly newTitle: string } | null>(null);
  const releaseKeys = useRef(new Map<string, string>());
  // The swap mutation lives here: its Idempotency-Key per body survives closing and reopening a panel.
  const [swapKeys] = useState(() => createBodyKeys(newIdempotencyKey));
  const swapBatch = useAddGiftBatch(client, celebrationId, swapKeys);
  const [swapOwner, setSwapOwner] = useState<string | null>(null);
  const approve = useApproveExternalGift(client, celebrationId);
  const reject = useRejectExternalGift(client, celebrationId);
  const [rejectTarget, setRejectTarget] = useState<GiftItem | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  // Gift 1.20.0 · a gift that is «No disponible» leaves the list when the host says so (the replacement does not remove it by itself).
  const remove = useRemoveGiftItem(client, celebrationId);
  const [removeTarget, setRemoveTarget] = useState<GiftItem | null>(null);
  const [removed, setRemoved] = useState<string | null>(null);
  const locked = approve.isPending || reject.isPending || release.isPending || remove.isPending;
  const flight = useSingleFlightGate();
  const go = (path: string) => () => onNavigate(withCelebration(path, celebrationId));
  // «Agregar regalo» is the screen's one action, always in the same place; the people waiting are a message, not a second primary.
  useScreenHeader({ actions: <ActionButton icon="plus" label={t("gifts.host.list.add")} onPress={go(HOST_ROUTES.giftCatalog)} testID="go-add" /> });
  if (list.isPending) return <Loading kind="gifts" />;
  // A celebration that never had a gift gets 404 GIFT_LIST_NOT_FOUND: that is the empty list, not a failure.
  const noListYet = isGiftListMissing(list.error);
  if (list.isError && !noListYet) return <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} />;
  const all = list.data ? catalogedFirst(list.data.items) : [];
  const items = all.filter((item) => !isGiftUnavailable(item));
  const unavailable = all.filter(isGiftUnavailable);
  // The pending count comes from the reservations endpoint, not from these rows: a reservation waiting on a gift that became unavailable still counts, because the host still has to answer it.
  const waiting = reservations.data?.items.filter((entry) => entry.status === "PENDING_REVIEW").length ?? 0;
  // Releasing does not make an unavailable gift available: what the dialog and the notice promise follows the gift as the list reads it now.
  const releaseUnavailable = (target: GiftItem): boolean => isGiftUnavailable(all.find((item) => item.id === target.id) ?? target);
  const renderRow = (item: GiftItem, index: number): ReactNode => <GiftRow key={item.id} first={index === 0} item={item} currencyLocale={locale} onApprove={(id) => { setRejected(null); reject.reset(); if (flight.begin()) approve.mutate(id, { onSettled: flight.end }); }} onReject={(target) => { setRejected(null); approve.reset(); reject.reset(); setRejectTarget(target); }} approving={approve.isPending && approve.variables === item.id} rejecting={reject.isPending && reject.variables === item.id} locked={locked} swap={{ add: swapBatch, owner: swapOwner, onOwner: setSwapOwner, celebrationId, eventType, content, onSwapped: (oldTitle, newTitle) => setSwapped({ oldTitle, newTitle }), onStore: go(HOST_ROUTES.giftCatalog), onGone: () => { void list.refetch(); } }} {...(isGiftUnavailable(item) ? { onRemove: () => { setRemoved(null); remove.reset(); setRemoveTarget(item); }, removing: remove.isPending && remove.variables === item.id } : {})} {...(item.status === "COMMITTED" && held.get(item.id) ? { onRelease: () => { const reservation = held.get(item.id); if (!reservation) return; setReleased(null); release.reset(); setReleaseTarget({ item, reservation }); }, releasing: release.isPending && release.variables?.reservationId === held.get(item.id)?.id } : {})} />;
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
      {removed ? <Notice kind="success"><Text style={styles.body} testID="gift-removed">{t("gifts.host.remove.done", { title: removed })}</Text></Notice> : null}
      {remove.isError && !removeTarget ? <GiftErrorNotice error={remove.error} onReload={() => { void list.refetch(); }} /> : null}
      {released ? <Notice kind="success">{t(releaseUnavailable(released) ? "gifts.host.release.doneUnavailable" : "gifts.host.release.done", { title: released.title })}</Notice> : null}
      {release.isError && !releaseTarget ? <GiftErrorNotice error={release.error} onReload={() => { void list.refetch(); }} /> : null}
      {all.length === 0 ? (
        <>
          <EmptyState illustration="noGifts" title={t("gifts.host.list.emptyTitle")} body={t("gifts.host.list.emptyBody")} />
          <RequesterVisibility celebrationId={celebrationId} />
        </>
      ) : (
        <>
          <GiftFigures items={items} />
          {list.data?.deliveryNotes ? <Text style={styles.body} testID="gift-delivery-notes">{t("gifts.host.wizard.list.delivery", { notes: list.data.deliveryNotes })}</Text> : null}
          <RequesterVisibility celebrationId={celebrationId} />
          {items.length > 0 ? (
            <View testID="gift-list">
              <RowList>
                <Stagger>{items.map(renderRow)}</Stagger>
              </RowList>
            </View>
          ) : null}
          {unavailable.length > 0 ? (
            <View testID="gift-unavailable-section" role="region" aria-labelledby="gift-unavailable-title" style={{ gap: spacing[3] }}>
              <Text nativeID="gift-unavailable-title" accessibilityRole="header" aria-level={2} style={styles.subtitle} testID="gift-unavailable">{t("gifts.host.unavailable.title", { count: unavailable.length })}</Text>
              <Text style={styles.body}>{t("gifts.host.unavailable.body")}</Text>
              <RowList>{unavailable.map(renderRow)}</RowList>
            </View>
          ) : null}
        </>
      )}
      <ConfirmDialog visible={rejectTarget !== null} danger title={t("gifts.host.rejectConfirm.title")} body={rejectTarget ? t("gifts.host.rejectConfirm.body", { title: rejectTarget.title }) : ""} confirmLabel={t("gifts.host.rejectProposal")}
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => { const target = rejectTarget; setRejectTarget(null); if (target && flight.begin()) reject.mutate(target.id, { onSuccess: () => setRejected(target.title), onSettled: flight.end }); }} />
      <ConfirmDialog visible={removeTarget !== null} danger busy={remove.isPending} title={t("gifts.host.remove.confirmTitle")} body={removeTarget ? t("gifts.host.remove.confirmBody", { title: removeTarget.title }) : ""}
        confirmLabel={t("gifts.host.remove.confirm")} cancelLabel={t("gifts.host.remove.keep")} confirmTestID="remove-confirm" cancelTestID="remove-keep"
        onCancel={() => { setRemoveTarget(null); remove.reset(); }}
        onConfirm={() => {
          const target = removeTarget;
          if (!target || !flight.begin()) return;
          remove.mutate(target.id, {
            onSuccess: () => { setRemoveTarget(null); setRemoved(target.title); },
            // Somebody already took it off, or it is not «No disponible» any more: close and show the refreshed list (the notice words the 409).
            onError: (error) => { if (problemCode(error) !== "GIFT_HAS_RESERVATIONS") setRemoveTarget(null); },
            onSettled: flight.end
          });
        }}>
        {remove.isError && removeTarget ? <GiftErrorNotice error={remove.error} /> : null}
      </ConfirmDialog>
      <ConfirmDialog visible={releaseTarget !== null} danger busy={release.isPending} title={t("gifts.host.release.confirmTitle")} body={releaseTarget ? t(releaseUnavailable(releaseTarget.item) ? "gifts.host.release.confirmBodyUnavailable" : "gifts.host.release.confirmBody", { title: releaseTarget.item.title }) : ""}
        confirmLabel={t("gifts.host.release.confirm")} cancelLabel={t("gifts.host.release.keep")} confirmTestID="release-confirm" cancelTestID="release-keep"
        onCancel={() => { setReleaseTarget(null); release.reset(); }}
        onConfirm={() => {
          const target = releaseTarget;
          if (!target || !flight.begin()) return;
          let key = releaseKeys.current.get(target.reservation.id);
          if (!key) { key = newIdempotencyKey(); releaseKeys.current.set(target.reservation.id, key); }
          release.mutate({ reservationId: target.reservation.id, idempotencyKey: key }, {
            onSuccess: () => { setReleaseTarget(null); setReleased(target.item); },
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
