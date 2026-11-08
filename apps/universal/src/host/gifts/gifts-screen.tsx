import { Chip, SkeletonList, Stagger, SwitchRow } from "@rsvp/ui";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatMinor } from "@rsvp/i18n";
import { catalogedFirst, useApproveExternalGift, useGiftList, useHostReservations, useRejectExternalGift, useGiftSettings, useUpdateGiftSettings, type GiftItem } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, useScreenHeader, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { GiftErrorNotice } from "./gift-errors";
import { ActionButton, ConfirmDialog, EmptyState, ErrorNotice, Loading, Notice, useStyles } from "../ui";
import { MoreOptions } from "../more-options";
import { Row, RowList } from "./offer-row";
import { RetryNotice } from "../guests/parts";
import { useSingleFlightGate } from "../../platform/single-flight";

type ChipTone = "yes" | "maybe" | "wait" | "no";
const STATUS_TONE: Readonly<Record<GiftItem["status"], ChipTone>> = { AVAILABLE: "wait", PROPOSED: "maybe", PENDING_REVIEW: "maybe", COMMITTED: "yes", REJECTED: "no" };

const NOT_FOUND = 404;

/** C29 · One gift: title, price and origin, its status as a chip (a dot and a word) and, for a proposal, the two decisions. */
function GiftRow({ item, first, currencyLocale, onApprove, onReject, approving, rejecting, locked }: { readonly item: GiftItem; readonly first: boolean; readonly currencyLocale: ReturnType<typeof useLocale>; readonly onApprove: (id: string) => void; readonly onReject: (item: GiftItem) => void; readonly approving: boolean; readonly rejecting: boolean; readonly locked: boolean }): ReactNode {
  const styles = useStyles();
  const t = useT();
  return (
    <Row first={first} testID={`gift-${item.id}`}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing[2] }}>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 200, gap: 2 }}>
          <Text style={styles.subtitle}>{item.title}</Text>
          <Text style={styles.body}>{formatMinor(item.price.amountMinor, item.price.currency, currencyLocale)} · {item.source === "CATALOGED" ? t("gifts.host.list.fromPartner") : t("gifts.host.list.external")}</Text>
          {item.reservedByName ? <Text style={styles.muted} testID={`gift-by-${item.id}`}>{t("gifts.host.list.reservedBy", { name: item.reservedByName })}</Text> : null}
        </View>
        <View testID={`gift-status-${item.id}`}><Chip tone={STATUS_TONE[item.status]}>{t(`gifts.host.status.${item.status}`)}</Chip></View>
      </View>
      {item.status === "PROPOSED" ? (
        <View style={styles.row}>
          <ActionButton variant="secondary" label={approving ? t("gifts.host.approvingProposal") : t("gifts.host.approveProposal")} busy={approving} disabled={locked} onPress={() => onApprove(item.id)} testID={`approve-proposal-${item.id}`} />
          <ActionButton variant="secondary" label={rejecting ? t("gifts.host.rejectingProposal") : t("gifts.host.rejectProposal")} busy={rejecting} disabled={locked} onPress={() => onReject(item)} testID={`reject-proposal-${item.id}`} />
        </View>
      ) : null}
    </Row>
  );
}

/** REQ-F23-06 · who may see who reserved. Guests default to not seeing the name; the host sees it unless they turn it off. */
function RequesterVisibility({ celebrationId }: { readonly celebrationId: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const settings = useGiftSettings(client, celebrationId);
  const update = useUpdateGiftSettings(client, celebrationId);
  if (settings.isPending) return <Loading />;
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

function GiftsBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const list = useGiftList(client, celebrationId);
  // The count of reservations waiting is a hint, not the screen: if it cannot be read the list still works.
  const reservations = useHostReservations(client, celebrationId, "PENDING_REVIEW");
  const approve = useApproveExternalGift(client, celebrationId);
  const reject = useRejectExternalGift(client, celebrationId);
  const [rejectTarget, setRejectTarget] = useState<GiftItem | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const locked = approve.isPending || reject.isPending;
  const flight = useSingleFlightGate();
  const go = (path: string) => () => onNavigate(withCelebration(path, celebrationId));
  // «Agregar regalo» is the screen's one action, always in the same place; the people waiting are a message, not a second primary.
  useScreenHeader({ actions: <ActionButton label={t("gifts.host.list.add")} onPress={go(HOST_ROUTES.giftCatalog)} testID="go-add" /> });
  if (list.isPending) return <SkeletonList count={4} row={{ minHeight: 76, avatar: false, trailing: true }} label={t("host.common.loading")} />;
  // A celebration that never had a gift gets 404 GIFT_LIST_NOT_FOUND: that is the empty list, not a failure.
  const noListYet = list.isError && list.error instanceof ApiError && list.error.status === NOT_FOUND;
  if (list.isError && !noListYet) return <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} />;
  const items = list.data ? catalogedFirst(list.data.items) : [];
  const waiting = reservations.data?.items.filter((entry) => entry.status === "PENDING_REVIEW").length ?? 0;
  return (
    <View style={{ gap: spacing[4] }}>
      {waiting > 0 ? (
        <Notice kind="info">
          <Text style={styles.subtitle}>{t("gifts.host.list.pending", { count: waiting })}</Text>
          <Text style={styles.body}>{t("gifts.host.list.pendingBody")}</Text>
          <View style={styles.row}><ActionButton variant="secondary" label={t("gifts.host.list.pendingAction")} onPress={go(HOST_ROUTES.giftInbox)} testID="go-inbox" /></View>
        </Notice>
      ) : null}
      <GiftErrorNotice error={approve.error} onReload={() => { void list.refetch(); }} />
      <GiftErrorNotice error={reject.error} onReload={() => { void list.refetch(); }} />
      {rejected ? <Notice kind="success">{t("gifts.host.proposalRejected", { title: rejected })}</Notice> : null}
      {items.length === 0 ? (
        <EmptyState illustration="noGifts" title={t("gifts.host.list.emptyTitle")} body={t("gifts.host.list.emptyBody")} />
      ) : (
        <>
          <RowList>
            <Stagger>{items.map((item, index) => <GiftRow key={item.id} first={index === 0} item={item} currencyLocale={locale} onApprove={(id) => { setRejected(null); reject.reset(); if (flight.begin()) approve.mutate(id, { onSettled: flight.end }); }} onReject={(target) => { setRejected(null); approve.reset(); reject.reset(); setRejectTarget(target); }} approving={approve.isPending && approve.variables === item.id} rejecting={reject.isPending && reject.variables === item.id} locked={locked} />)}</Stagger>
          </RowList>
        </>
      )}
      <MoreOptions label={t("gifts.host.list.more")} testID="more-gifts"><RequesterVisibility celebrationId={celebrationId} /></MoreOptions>
      <ConfirmDialog visible={rejectTarget !== null} danger title={t("gifts.host.rejectConfirm.title")} body={rejectTarget ? t("gifts.host.rejectConfirm.body", { title: rejectTarget.title }) : ""} confirmLabel={t("gifts.host.rejectProposal")}
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => { const target = rejectTarget; setRejectTarget(null); if (target && flight.begin()) reject.mutate(target.id, { onSuccess: () => setRejected(target.title), onSettled: flight.end }); }} />
    </View>
  );
}

export function GiftsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.title")} intro={t("gifts.host.intro")}>{({ celebration }) => <GiftsBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
