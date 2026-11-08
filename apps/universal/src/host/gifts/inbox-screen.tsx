import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { SkeletonList, Stagger } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useDecideReservation, useGiftList, useGuestDetail, useGuestGroups, useHostReservations, type GiftReservation } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { GiftErrorNotice } from "./gift-errors";
import { ActionButton, EmptyState, Notice, useStyles } from "../ui";
import { HOST_ROUTES, withCelebration } from "../routes";
import { Row, RowList } from "./offer-row";
import { RetryNotice } from "../guests/parts";
import { useSingleFlightGate } from "../../platform/single-flight";


/** Who asked, in full: among dozens of guests a first name alone is not enough. The display name the guest typed stays as the fallback; the guest record adds the full name and the group when the guest list can be read. */
function Requester({ reservation, celebrationId }: { readonly reservation: GiftReservation; readonly celebrationId: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const visible = !reservation.requesterHidden && Boolean(reservation.guestId);
  const guest = useGuestDetail(client, celebrationId, visible ? reservation.guestId ?? "" : "");
  const groups = useGuestGroups(client, celebrationId);
  if (reservation.requesterHidden) return <><Text style={styles.body}>{t("gifts.host.inbox.requester", { name: t("gifts.host.inbox.hidden") })}</Text><Text style={styles.muted} testID={`hidden-${reservation.id}`}>{t("gifts.host.inbox.hiddenHelp")}</Text></>;
  const full = guest.data?.name?.trim();
  const typed = reservation.guestDisplayName?.trim();
  const name = full || typed || t("gifts.host.inbox.anonymous");
  const groupId = guest.data?.groupId;
  const group = groupId ? groups.data?.items.find((entry) => entry.id === groupId)?.name : undefined;
  return (
    <>
      <Text style={styles.body}>{t("gifts.host.inbox.requester", { name })}</Text>
      {typed && full && typed !== full ? <Text style={styles.muted}>{t("gifts.host.inbox.signedAs", { name: typed })}</Text> : null}
      {group ? <Text style={styles.muted}>{t("gifts.host.inbox.group", { group })}</Text> : null}
    </>
  );
}

/** C25 · Pending reservations: who asked, which gift, approve or reject; a reservation somebody already decided (409) refreshes the list. */
function InboxBody({ celebrationId, timeZone, onSeeList }: { readonly celebrationId: string; readonly timeZone: string; readonly onSeeList: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const reservations = useHostReservations(client, celebrationId, "PENDING_REVIEW");
  const gifts = useGiftList(client, celebrationId);
  const decide = useDecideReservation(client, celebrationId);
  const flight = useSingleFlightGate();
  const [notice, setNotice] = useState<{ kind: "success" | "info"; text: string; approved?: boolean } | null>(null);
  const resolve = (reservation: GiftReservation, decision: "approve" | "reject"): void => {
    setNotice(null);
    if (!flight.begin()) return;
    decide.mutate({ reservationId: reservation.id, decision }, {
      onSettled: flight.end,
      onSuccess: () => setNotice({ kind: "success", text: decision === "approve" ? t("gifts.host.inbox.approved") : t("gifts.host.inbox.rejected"), approved: decision === "approve" }),
      onError: (error) => { if (error instanceof ApiError && error.status === 409) setNotice({ kind: "info", text: t("gifts.host.inbox.stale") }); }
    });
  };
  if (reservations.isPending) return <SkeletonList count={3} row={{ minHeight: 132, avatar: false, lines: 2, trailing: false }} label={t("host.common.loading")} />;
  if (reservations.isError) return <RetryNotice error={reservations.error} onRetry={() => { void reservations.refetch(); }} />;
  const open = reservations.data.items.filter((entry) => entry.status === "PENDING_REVIEW");
  const conflict = decide.error instanceof ApiError && decide.error.status === 409;
  return (
    <View style={{ gap: spacing[4] }}>
      {notice ? <Notice kind={notice.kind}><Text style={styles.body}>{notice.text}</Text></Notice> : null}
      {decide.isError && !conflict ? <GiftErrorNotice error={decide.error} /> : null}
      {open.length === 0 ? (
        <EmptyState illustration="success" title={t("gifts.host.inbox.emptyTitle")} body={t("gifts.host.inbox.emptyBody")} action={<ActionButton variant="secondary" label={t("gifts.host.inbox.emptyAction")} onPress={onSeeList} testID="back-to-list" />} />
      ) : (
        <RowList>
          <Stagger>{open.map((reservation, index) => {
            const gift = gifts.data?.items.find((item) => item.id === reservation.itemId);
            const busy = decide.isPending && decide.variables?.reservationId === reservation.id ? decide.variables.decision : null;
            return (
              <Row key={reservation.id} first={index === 0} testID={`reservation-${reservation.id}`}>
                <Text style={styles.itemTitle}>{t("gifts.host.inbox.gift", { title: gift?.title ?? reservation.itemId.slice(0, 8) })}</Text>
                <Requester reservation={reservation} celebrationId={celebrationId} />
                {reservation.message ? <Text style={styles.muted}>“{reservation.message}”</Text> : null}
                <Text style={styles.muted}>{t("gifts.host.inbox.requestedAt", { date: formatCelebrationDate(reservation.requestedAt, { locale, timeZone }) })}</Text>
                <View style={styles.row}>
                  <ActionButton variant="secondary" label={t("gifts.host.inbox.approve")} busy={busy === "approve"} disabled={busy !== null} onPress={() => resolve(reservation, "approve")} testID={`approve-${reservation.id}`} />
                  <ActionButton variant="secondary" label={t("gifts.host.inbox.reject")} busy={busy === "reject"} disabled={busy !== null} onPress={() => resolve(reservation, "reject")} testID={`reject-${reservation.id}`} />
                </View>
              </Row>
            );
          })}</Stagger>
        </RowList>
      )}
    </View>
  );
}

export function GiftInboxScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="giftInbox" title={t("gifts.host.title")} intro={t("gifts.host.inbox.intro")}>{({ celebration }) => <InboxBody celebrationId={celebration.id} timeZone={celebration.timeZone} onSeeList={() => props.onNavigate(withCelebration(HOST_ROUTES.gifts, celebration.id))} />}</CelebrationScreen>;
}
