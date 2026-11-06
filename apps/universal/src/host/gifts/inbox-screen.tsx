import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useDecideReservation, useGiftList, useHostReservations, type GiftReservation } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { ActionButton, ErrorNotice, Loading, Notice, styles } from "../ui";
import { RetryNotice } from "../guests/parts";
import { useSingleFlightGate } from "../../platform/single-flight";

/** C25 · Pending reservations: who asked, which gift, approve or reject; a reservation somebody already decided (409) refreshes the list. */
function InboxBody({ celebrationId, timeZone }: { readonly celebrationId: string; readonly timeZone: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const reservations = useHostReservations(client, celebrationId, "PENDING_REVIEW");
  const gifts = useGiftList(client, celebrationId);
  const decide = useDecideReservation(client, celebrationId);
  const flight = useSingleFlightGate();
  const [notice, setNotice] = useState<{ kind: "success" | "info"; text: string } | null>(null);
  const resolve = (reservation: GiftReservation, decision: "approve" | "reject"): void => {
    setNotice(null);
    if (!flight.begin()) return;
    decide.mutate({ reservationId: reservation.id, decision }, {
      onSettled: flight.end,
      onSuccess: () => setNotice({ kind: "success", text: decision === "approve" ? t("gifts.host.inbox.approved") : t("gifts.host.inbox.rejected") }),
      onError: (error) => { if (error instanceof ApiError && error.status === 409) setNotice({ kind: "info", text: t("gifts.host.inbox.stale") }); }
    });
  };
  if (reservations.isPending) return <Loading />;
  if (reservations.isError) return <RetryNotice error={reservations.error} onRetry={() => { void reservations.refetch(); }} />;
  const open = reservations.data.items.filter((entry) => entry.status === "PENDING_REVIEW");
  const conflict = decide.error instanceof ApiError && decide.error.status === 409;
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("gifts.host.inbox.intro")}</Text>
      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}
      {decide.isError && !conflict ? <ErrorNotice error={decide.error} /> : null}
      {open.length === 0 ? <Notice>{t("gifts.host.inbox.empty")}</Notice> : open.map((reservation) => {
        const gift = gifts.data?.items.find((item) => item.id === reservation.itemId);
        const busy = decide.isPending && decide.variables?.reservationId === reservation.id ? decide.variables.decision : null;
        return (
          <View key={reservation.id} testID={`reservation-${reservation.id}`} style={[styles.card, { gap: spacing[2] }]}>
            <Text style={styles.subtitle}>{t("gifts.host.inbox.gift", { title: gift?.title ?? reservation.itemId.slice(0, 8) })}</Text>
            <Text style={styles.body}>{t("gifts.host.inbox.requester", { name: reservation.requesterHidden ? t("gifts.host.inbox.hidden") : reservation.guestDisplayName || t("gifts.host.inbox.anonymous") })}</Text>
            {reservation.requesterHidden ? <Text style={styles.muted} testID={`hidden-${reservation.id}`}>{t("gifts.host.inbox.hiddenHelp")}</Text> : null}
            {reservation.message ? <Text style={styles.muted}>“{reservation.message}”</Text> : null}
            <Text style={styles.muted}>{t("gifts.host.inbox.requestedAt", { date: formatCelebrationDate(reservation.requestedAt, { locale, timeZone }) })}</Text>
            <View style={styles.row}>
              <ActionButton label={t("gifts.host.inbox.approve")} busy={busy === "approve"} disabled={busy !== null} onPress={() => resolve(reservation, "approve")} testID={`approve-${reservation.id}`} />
              <ActionButton variant="danger" label={t("gifts.host.inbox.reject")} busy={busy === "reject"} disabled={busy !== null} onPress={() => resolve(reservation, "reject")} testID={`reject-${reservation.id}`} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function GiftInboxScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="giftInbox" title={t("gifts.host.inbox.title")}>{({ celebration }) => <InboxBody celebrationId={celebration.id} timeZone={celebration.timeZone} />}</CelebrationScreen>;
}
