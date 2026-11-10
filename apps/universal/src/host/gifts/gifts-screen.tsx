import { useRef, useState, type ReactNode } from "react";
import { Switch, Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { colors, spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { catalogedFirst, useApproveExternalGift, useGiftList, useGiftSettings, useHostGiftVisibility, type GiftItem } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Loading, Notice, Section, styles } from "../ui";
import { GiftFailure, PublicationLine } from "./parts";

function GiftRow({ item, locale, showRequester, onApprove, approving, disabled }: { readonly item: GiftItem; readonly locale: ReturnType<typeof useLocale>; readonly showRequester: boolean; readonly onApprove: (id: string) => void; readonly approving: boolean; readonly disabled: boolean }): ReactNode {
  const t = useT();
  return <View testID={`gift-${item.id}`} style={[styles.card, { gap: spacing[2] }]}>
    <Text accessibilityRole="header" style={styles.subtitle}>{item.title}</Text>
    <Text style={styles.body}>{formatMinor(item.price.amountMinor, item.price.currency, locale)} · {t(item.source === "CATALOGED" ? "gifts.host.list.fromPartner" : "gifts.host.list.external")}</Text>
    <Text style={styles.label} testID={`gift-status-${item.id}`}>{t(`gifts.host.status.${item.status}`)}</Text>
    <PublicationLine status={item.status} />
    {showRequester && item.reservedByName ? <Text style={styles.muted} testID={`gift-by-${item.id}`}>{t("gifts.host.list.reservedBy", { name: item.reservedByName })}</Text> : null}
    {item.status === "PROPOSED" ? <ActionButton label={approving ? t("gifts.host.approvingProposal") : t("gifts.host.approveProposal")} busy={approving} disabled={disabled} onPress={() => onApprove(item.id)} testID={`approve-proposal-${item.id}`} /> : null}
  </View>;
}

/** Preferences remain authoritative; names are masked while a write and its refetch are pending. */
function RequesterVisibility({ celebrationId, onMask }: { readonly celebrationId: string; readonly onMask: (value: boolean) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const settings = useGiftSettings(client, celebrationId);
  const update = useHostGiftVisibility(client, celebrationId);
  const inFlight = useRef(false);
  const [mismatch, setMismatch] = useState(false);
  if (settings.isPending) return <Loading />;
  if (settings.isError) return <><Notice>{t("hostGifts.privacyUnavailable")}</Notice><GiftFailure error={settings.error} onRetry={() => { void settings.refetch(); }} /></>;
  const current = settings.data;
  const save = (key: "showRequesterToHost" | "showRequesterToGuests", value: boolean): void => {
    if (inFlight.current) return;
    inFlight.current = true; onMask(true); setMismatch(false);
    const input = { showRequesterToHost: current.showRequesterToHost, showRequesterToGuests: current.showRequesterToGuests, [key]: value };
    update.mutate(input, {
      onSuccess: (saved) => setMismatch(saved.showRequesterToHost !== input.showRequesterToHost || saved.showRequesterToGuests !== input.showRequesterToGuests),
      onSettled: () => { inFlight.current = false; onMask(false); }
    });
  };
  const rows = [
    { key: "showRequesterToHost" as const, label: t("gifts.host.visibility.host"), help: t("gifts.host.visibility.hostHelp") },
    { key: "showRequesterToGuests" as const, label: t("gifts.host.visibility.guests"), help: t("gifts.host.visibility.guestsHelp") }
  ];
  return <Section title={t("gifts.host.visibility.title")}>
    <Text style={styles.body}>{t("gifts.host.visibility.intro")}</Text>
    {rows.map((row) => <View key={row.key} style={[styles.row, { justifyContent: "space-between", minHeight: 48 }]}>
      <View style={{ flexShrink: 1 }}><Text style={styles.label}>{row.label}</Text><Text style={styles.muted}>{row.help}</Text></View>
      <Switch accessibilityLabel={row.label} testID={`visibility-${row.key}`} value={current[row.key]} disabled={update.isPending} onValueChange={(value) => save(row.key, value)}
        trackColor={{ true: colors.light.primary, false: colors.light.border }} thumbColor={colors.light.surface} />
    </View>)}
    {update.isPending ? <Text accessibilityLiveRegion="polite" style={styles.muted}>{t("hostGifts.settingsSaving")}</Text> : null}
    {update.isSuccess && !mismatch ? <Notice kind="success">{t("hostGifts.settingsChanged")}</Notice> : null}
    {mismatch ? <Notice kind="error">{t("hostGifts.privacyUnavailable")}</Notice> : null}
    <GiftFailure error={update.error} />
  </Section>;
}

function GiftsBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const list = useGiftList(client, celebrationId);
  const settings = useGiftSettings(client, celebrationId);
  const approve = useApproveExternalGift(client, celebrationId);
  const lock = useRef(false);
  const [privacyPending, setPrivacyPending] = useState(false);
  const go = (path: string) => () => onNavigate(withCelebration(path, celebrationId));
  const approveProposal = (id: string): void => {
    if (lock.current) return;
    lock.current = true;
    approve.mutate(id, { onError: (error) => { if (error instanceof ApiError && error.status === 409) void list.refetch(); }, onSettled: () => { lock.current = false; } });
  };
  if (list.isPending) return <Loading />;
  if (list.isError) return <GiftFailure error={list.error} onRetry={() => { void list.refetch(); }} />;
  const items = catalogedFirst(list.data.items);
  const showRequester = settings.isSuccess && settings.data.showRequesterToHost && !privacyPending;
  return <View style={{ gap: spacing[4] }}>
    <Text style={styles.body}>{t("gifts.host.intro")}</Text>
    <View style={styles.row}>
      <ActionButton label={t("gifts.host.catalog.title")} onPress={go(HOST_ROUTES.giftCatalog)} testID="go-catalog" />
      <ActionButton variant="secondary" label={t("gifts.host.providers.title")} onPress={go(HOST_ROUTES.giftProviders)} testID="go-providers" />
      <ActionButton variant="secondary" label={t("gifts.host.external.title")} onPress={go(HOST_ROUTES.giftExternal)} testID="go-external" />
      <ActionButton variant="secondary" label={t("gifts.host.inbox.title")} onPress={go(HOST_ROUTES.giftInbox)} testID="go-inbox" />
    </View>
    <RequesterVisibility celebrationId={celebrationId} onMask={setPrivacyPending} />
    <GiftFailure error={approve.error} onRetry={() => { void list.refetch(); }} />
    <Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.host.list.title")}</Text>
    {items.length === 0 ? <Notice>{t("gifts.host.list.empty")}</Notice> : items.map((item) => <GiftRow key={item.id} item={item} locale={locale} showRequester={showRequester} onApprove={approveProposal} disabled={approve.isPending} approving={approve.isPending && approve.variables === item.id} />)}
  </View>;
}

export function GiftsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.title")}>{({ celebration }) => <GiftsBody key={celebration.id} celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
