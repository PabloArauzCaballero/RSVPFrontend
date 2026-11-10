import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useGiftList, usePushGiftReservation } from "@rsvp/query-hooks";
import { spacing } from "@rsvp/design-tokens";
import { loginHref } from "../auth/routes";
import { CelebrationScreen, type ScreenProps } from "../host/gate";
import { HOST_ROUTES, withCelebration } from "../host/routes";
import { ActionButton, Loading, Notice, Screen, styles } from "../host/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { createGiftActionHandler, giftActionFailure, giftRequestPath, refreshGiftActionQueries, validGiftTarget, type GiftActionResult, type GiftActionTarget } from "./actions";
import { GIFT_APPROVE, GIFT_REJECT } from "./categories";

export function GiftRequestScreen({ reservationId, ...props }: ScreenProps & { readonly reservationId?: string }): ReactNode {
  const t = useT();
  const target = { celebrationId: props.celebrationId ?? "", reservationId: reservationId ?? "" };
  if (!validGiftTarget(target)) return <Screen title={t("pushActions.title")}><Notice>{t("pushActions.missing")}</Notice><ActionButton label={t("pushActions.inbox")} onPress={() => props.onNavigate(withCelebration(HOST_ROUTES.giftInbox, props.celebrationId))} /></Screen>;
  return <CelebrationScreen {...props} current="giftInbox" title={t("pushActions.title")}>{({ celebration }) => <RequestBody key={`${target.celebrationId}:${target.reservationId}`} target={target} timeZone={celebration.timeZone} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}

function RequestBody({ target, timeZone, onNavigate }: { readonly target: GiftActionTarget; readonly timeZone: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const queries = useQueryClient();
  const reservation = usePushGiftReservation(client, target.celebrationId, target.reservationId);
  const gifts = useGiftList(client, target.celebrationId);
  const execute = useMemo(() => createGiftActionHandler(client, { synchronize: (id) => refreshGiftActionQueries(queries, id) }), [client, queries]);
  const locked = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<GiftActionResult | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshGiftActionQueries(queries, target.celebrationId);
    });
    return () => subscription.remove();
  }, [queries, target.celebrationId]);
  const decide = async (identifier: string): Promise<void> => {
    if (locked.current) return;
    locked.current = true;
    setBusy(identifier); setOutcome(null);
    try { setOutcome(await execute(target, identifier)); }
    finally { locked.current = false; setBusy(null); }
  };
  const retry = (): void => { setOutcome(null); void reservation.refetch(); void gifts.refetch(); };
  const failure = reservation.isError ? giftActionFailure(reservation.error) : null;
  const feedback = outcome ?? failure;
  const entry = outcome?.reservation ?? reservation.data;
  const gift = gifts.data?.items.find((item) => item.id === entry?.itemId);
  const back = <ActionButton variant="secondary" label={t("pushActions.inbox")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.giftInbox, target.celebrationId))} />;
  if (reservation.isPending) return <Loading />;
  return (
    <View style={{ gap: spacing[4] }}>
      {feedback ? <Notice kind={feedback.kind === "applied" ? "success" : ["resolved", "changed", "busy"].includes(feedback.kind) ? "info" : "error"}>{t(`pushActions.${feedback.kind}`)}</Notice> : null}
      {feedback?.kind === "sessionExpired" ? <ActionButton label={t("pushActions.signIn")} onPress={() => onNavigate(loginHref(giftRequestPath(target)))} /> : null}
      {!reservation.isError && !entry ? <Notice>{t("pushActions.missing")}</Notice> : null}
      {entry && !reservation.isError ? <View style={{ gap: spacing[3] }} testID="push-request-detail">
        <Text style={styles.subtitle}>{gift?.title ?? t("pushActions.gift")}</Text>
        <Text style={styles.body}>{t("pushActions.requester", { name: entry.requesterHidden ? t("pushActions.hidden") : entry.guestDisplayName || t("pushActions.anonymous") })}</Text>
        {entry.message ? <Text style={styles.body}>{entry.message}</Text> : null}
        <Text style={styles.muted}>{t("pushActions.requestedAt", { date: formatCelebrationDate(entry.requestedAt, { locale, timeZone }) })}</Text>
        <Text style={styles.body} testID="push-request-status">{t(`pushActions.status.${entry.status}`)}</Text>
        {gifts.isError ? <Notice>{t("pushActions.giftUnavailable")}</Notice> : null}
        {entry.status === "PENDING_REVIEW" && !["sessionExpired", "forbidden", "missing"].includes(feedback?.kind ?? "") ? <View style={styles.row}>
          <ActionButton label={t("pushActions.approve")} busy={busy === GIFT_APPROVE} disabled={busy !== null} testID="push-approve" onPress={() => { void decide(GIFT_APPROVE); }} />
          <ActionButton variant="danger" label={t("pushActions.reject")} busy={busy === GIFT_REJECT} disabled={busy !== null} testID="push-reject" onPress={() => { void decide(GIFT_REJECT); }} />
        </View> : null}
      </View> : null}
      {feedback && ["failed", "changed", "invalid"].includes(feedback.kind) ? <ActionButton variant="secondary" label={t("pushActions.retry")} onPress={retry} /> : null}
      {back}
    </View>
  );
}
