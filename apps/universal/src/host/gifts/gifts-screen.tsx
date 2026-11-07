import { SwitchRow } from "@rsvp/ui";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { catalogedFirst, useApproveExternalGift, useGiftList, useRejectExternalGift, useGiftSettings, useUpdateGiftSettings, type GiftItem } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, ConfirmDialog, ErrorNotice, Loading, Notice, Section, styles } from "../ui";
import { RetryNotice } from "../guests/parts";
import { useSingleFlightGate } from "../../platform/single-flight";

/** C29 · Status of each gift (available, pending, committed, proposed) with the doors to the catalog, the external gift and the inbox. */
function GiftRow({ item, currencyLocale, onApprove, onReject, approving, rejecting, locked }: { readonly item: GiftItem; readonly currencyLocale: ReturnType<typeof useLocale>; readonly onApprove: (id: string) => void; readonly onReject: (item: GiftItem) => void; readonly approving: boolean; readonly rejecting: boolean; readonly locked: boolean }): ReactNode {
  const t = useT();
  return (
    <View testID={`gift-${item.id}`} style={[styles.card, { gap: spacing[1] }]}>
      <Text style={styles.subtitle}>{item.title}</Text>
      <Text style={styles.body}>{formatMinor(item.price.amountMinor, item.price.currency, currencyLocale)} · {item.source === "CATALOGED" ? t("gifts.host.list.fromPartner") : t("gifts.host.list.external")}</Text>
      <Text style={styles.label} testID={`gift-status-${item.id}`}>{t(`gifts.host.status.${item.status}`)}</Text>
      {item.reservedByName ? <Text style={styles.muted} testID={`gift-by-${item.id}`}>{t("gifts.host.list.reservedBy", { name: item.reservedByName })}</Text> : null}
      {item.status === "PROPOSED" ? (
        <View style={styles.row}>
          <ActionButton label={approving ? t("gifts.host.approvingProposal") : t("gifts.host.approveProposal")} busy={approving} disabled={locked} onPress={() => onApprove(item.id)} testID={`approve-proposal-${item.id}`} />
          <ActionButton variant="danger" label={rejecting ? t("gifts.host.rejectingProposal") : t("gifts.host.rejectProposal")} busy={rejecting} disabled={locked} onPress={() => onReject(item)} testID={`reject-proposal-${item.id}`} />
        </View>
      ) : null}
    </View>
  );
}

/** REQ-F23-06 · who may see who reserved. Guests default to not seeing the name; the host sees it unless they turn it off. */
function RequesterVisibility({ celebrationId }: { readonly celebrationId: string }): ReactNode {
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
    <Section title={t("gifts.host.visibility.title")}>
      <Text style={styles.body}>{t("gifts.host.visibility.intro")}</Text>
      {rows.map((row) => (
        <SwitchRow key={row.key} label={row.label} hint={row.help} value={current[row.key]} disabled={update.isPending} testID={`visibility-${row.key}`}
          onChange={() => update.mutate({ showRequesterToHost: current.showRequesterToHost, showRequesterToGuests: current.showRequesterToGuests, [row.key]: !current[row.key] }, { onSuccess: () => { void settings.refetch(); } })} />
      ))}
      {update.isSuccess ? <Notice kind="success">{t("gifts.host.visibility.saved")}</Notice> : null}
      {update.isError ? <ErrorNotice error={update.error} /> : null}
    </Section>
  );
}

function GiftsBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const list = useGiftList(client, celebrationId);
  const approve = useApproveExternalGift(client, celebrationId);
  const reject = useRejectExternalGift(client, celebrationId);
  const [rejectTarget, setRejectTarget] = useState<GiftItem | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const locked = approve.isPending || reject.isPending;
  const flight = useSingleFlightGate();
  const go = (path: string) => () => onNavigate(withCelebration(path, celebrationId));
  if (list.isPending) return <Loading />;
  if (list.isError) return <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} />;
  const items = catalogedFirst(list.data.items);
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("gifts.host.intro")}</Text>
      <View style={styles.row}>
        <ActionButton label={t("gifts.host.catalog.title")} onPress={go(HOST_ROUTES.giftCatalog)} testID="go-catalog" />
        <ActionButton variant="secondary" label={t("gifts.host.providers.title")} onPress={go(HOST_ROUTES.giftProviders)} testID="go-providers" />
        <ActionButton variant="secondary" label={t("gifts.host.external.title")} onPress={go(HOST_ROUTES.giftExternal)} testID="go-external" />
        <ActionButton variant="secondary" label={t("gifts.host.inbox.title")} onPress={go(HOST_ROUTES.giftInbox)} testID="go-inbox" />
      </View>
      <RequesterVisibility celebrationId={celebrationId} />
      <ErrorNotice error={approve.error} onReload={() => { void list.refetch(); }} />
      <ErrorNotice error={reject.error} onReload={() => { void list.refetch(); }} />
      {rejected ? <Notice kind="success">{t("gifts.host.proposalRejected", { title: rejected })}</Notice> : null}
      <Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.host.list.title")}</Text>
      {items.length === 0 ? <Notice>{t("gifts.host.list.empty")}</Notice> : items.map((item) => <GiftRow key={item.id} item={item} currencyLocale={locale} onApprove={(id) => { setRejected(null); reject.reset(); if (flight.begin()) approve.mutate(id, { onSettled: flight.end }); }} onReject={(target) => { setRejected(null); approve.reset(); reject.reset(); setRejectTarget(target); }} approving={approve.isPending && approve.variables === item.id} rejecting={reject.isPending && reject.variables === item.id} locked={locked} />)}
      <ConfirmDialog visible={rejectTarget !== null} danger title={t("gifts.host.rejectConfirm.title")} body={rejectTarget ? t("gifts.host.rejectConfirm.body", { title: rejectTarget.title }) : ""} confirmLabel={t("gifts.host.rejectProposal")}
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => { const target = rejectTarget; setRejectTarget(null); if (target && flight.begin()) reject.mutate(target.id, { onSuccess: () => setRejected(target.title), onSettled: flight.end }); }} />
    </View>
  );
}

export function GiftsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.title")}>{({ celebration }) => <GiftsBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
