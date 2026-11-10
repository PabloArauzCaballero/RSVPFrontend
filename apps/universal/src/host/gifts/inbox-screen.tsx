import { useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useDecideReservation, useGiftList, useGiftSettings, useHostReservations, type GiftReservation } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { ActionButton, Loading, Notice, styles } from "../ui";
import { GiftFailure } from "./parts";

function InboxBody({ celebrationId, timeZone }: { readonly celebrationId: string; readonly timeZone: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const reservations = useHostReservations(client, celebrationId, "PENDING_REVIEW");
  const gifts = useGiftList(client, celebrationId);
  const settings = useGiftSettings(client, celebrationId);
  const decide = useDecideReservation(client, celebrationId);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState<"approved" | "rejected" | "stale" | null>(null);
  const resolve = (reservation: GiftReservation, decision: "approve" | "reject"): void => {
    if (inFlight.current) return;
    inFlight.current = true; setNotice(null);
    decide.mutate({ reservationId: reservation.id, decision }, {
      onSuccess: (resolved) => setNotice(resolved.status === "COMMITTED" ? "approved" : resolved.status === "REJECTED" ? "rejected" : "stale"),
      onError: (error) => { if (error instanceof ApiError && error.status === 409) setNotice("stale"); },
      onSettled: () => { inFlight.current = false; }
    });
  };
  if (reservations.isPending) return <Loading />;
  if (reservations.isError) return <GiftFailure error={reservations.error} onRetry={() => { void reservations.refetch(); }} />;
  const open = reservations.data.items.filter((entry) => entry.status === "PENDING_REVIEW");
  const conflict = decide.error instanceof ApiError && decide.error.status === 409;
  const allowNames = settings.isSuccess && settings.data.showRequesterToHost;
  return <View style={{ gap: spacing[4] }}>
    <Text style={styles.body}>{t("gifts.host.inbox.intro")}</Text>
    {notice ? <Notice kind={notice === "stale" ? "info" : "success"}>{t(`gifts.host.inbox.${notice}`)}</Notice> : null}
    {decide.isError && !conflict ? <GiftFailure error={decide.error} /> : null}
    {settings.isError ? <><Notice>{t("hostGifts.privacyUnavailable")}</Notice><GiftFailure error={settings.error} onRetry={() => { void settings.refetch(); }} /></> : null}
    {gifts.isError ? <GiftFailure error={gifts.error} onRetry={() => { void gifts.refetch(); }} /> : null}
    {open.length === 0 ? <Notice>{t("gifts.host.inbox.empty")}</Notice> : open.map((reservation) => {
      const gift = gifts.data?.items.find((item) => item.id === reservation.itemId);
      const busy = decide.isPending && decide.variables?.reservationId === reservation.id ? decide.variables.decision : null;
      const hidden = reservation.requesterHidden || settings.data?.showRequesterToHost === false;
      const name = !allowNames || reservation.requesterHidden ? t(hidden ? "gifts.host.inbox.hidden" : "hostGifts.requesterUnavailable") : reservation.guestDisplayName || t("gifts.host.inbox.anonymous");
      return <View key={reservation.id} testID={`reservation-${reservation.id}`} style={[styles.card, { gap: spacing[2] }]}>
        <Text accessibilityRole="header" style={styles.subtitle}>{gift ? t("gifts.host.inbox.gift", { title: gift.title }) : t("hostGifts.itemUnavailable")}</Text>
        {!gift && !gifts.isPending ? <ActionButton variant="secondary" label={t("hostGifts.refresh")} onPress={() => { void gifts.refetch(); }} /> : null}
        <Text style={styles.body}>{t("gifts.host.inbox.requester", { name })}</Text>
        {hidden ? <Text style={styles.muted} testID={`hidden-${reservation.id}`}>{t("gifts.host.inbox.hiddenHelp")}</Text> : null}
        {allowNames && !reservation.requesterHidden && reservation.message ? <Text style={styles.muted}>“{reservation.message}”</Text> : null}
        <Text style={styles.muted}>{t("gifts.host.inbox.requestedAt", { date: formatCelebrationDate(reservation.requestedAt, { locale, timeZone }) })}</Text>
        <View style={styles.row}>
          <ActionButton label={t("gifts.host.inbox.approve")} busy={busy === "approve"} disabled={decide.isPending || !gift} onPress={() => resolve(reservation, "approve")} testID={`approve-${reservation.id}`} />
          <ActionButton variant="danger" label={t("gifts.host.inbox.reject")} busy={busy === "reject"} disabled={decide.isPending || !gift} onPress={() => resolve(reservation, "reject")} testID={`reject-${reservation.id}`} />
        </View>
      </View>;
    })}
  </View>;
}

export function GiftInboxScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="giftInbox" title={t("gifts.host.inbox.title")}>{({ celebration }) => <InboxBody key={celebration.id} celebrationId={celebration.id} timeZone={celebration.timeZone} />}</CelebrationScreen>;
}