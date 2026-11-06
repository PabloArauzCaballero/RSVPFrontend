import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { pendingRequests, useCompanionRequests, useGuestDetail, useResolveCompanionRequest, type CompanionDecision, type CompanionRequest } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { guestDetailPath, withCelebration } from "../routes";
import { ActionButton, Loading, Notice, styles } from "../ui";
import { FailureNotice, RetryNotice } from "./parts";
import { useSingleFlightGate } from "../../platform/single-flight";

/** C26 · Companion requests inbox: approve or reject with one tap; a request someone else already decided refreshes the list (REQ-F17-03). */

function RequestCard({ request, celebrationId, busy, locked, onDecide, onOpen }: { readonly request: CompanionRequest; readonly celebrationId: string; readonly busy: CompanionDecision | null; readonly locked: boolean; readonly onDecide: (decision: CompanionDecision) => void; readonly onOpen: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const guest = useGuestDetail(client, celebrationId, request.guestId);
  return (
    <View testID={`request-${request.id}`} style={[styles.card, { gap: spacing[2] }]}>
      <Text style={styles.subtitle}>{guest.data?.name ?? t("guests.requests.guest")}</Text>
      <Text style={styles.body}>{t("guests.requests.ask", { requested: request.requestedCompanions, allowed: request.allowedCompanions })}</Text>
      <View style={styles.row}>
        <ActionButton label={busy === "APPROVED" ? t("guests.requests.approving") : t("guests.requests.approve")} busy={busy === "APPROVED"} disabled={busy !== null || locked} onPress={() => onDecide("APPROVED")} testID={`approve-${request.id}`} />
        <ActionButton variant="danger" label={busy === "REJECTED" ? t("guests.requests.rejecting") : t("guests.requests.reject")} busy={busy === "REJECTED"} disabled={busy !== null || locked} onPress={() => onDecide("REJECTED")} testID={`reject-${request.id}`} />
        <ActionButton variant="secondary" label={t("guests.requests.open")} onPress={onOpen} />
      </View>
    </View>
  );
}

function RequestsBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const requests = useCompanionRequests(client, celebrationId);
  const decide = useResolveCompanionRequest(client, celebrationId);
  const [notice, setNotice] = useState<{ kind: "success" | "info"; text: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const flight = useSingleFlightGate();

  const resolve = (request: CompanionRequest, decision: CompanionDecision): void => {
    if (!flight.begin()) return;
    setPendingId(request.id); setNotice(null);
    decide.mutate({ requestId: request.id, decision }, {
      onSuccess: () => setNotice({ kind: "success", text: decision === "APPROVED" ? t("guests.requests.approved") : t("guests.requests.rejected") }),
      onError: (error) => { if (error instanceof ApiError && error.status === 409) setNotice({ kind: "info", text: t("guests.requests.stale") }); },
      onSettled: () => { setPendingId(null); flight.end(); }
    });
  };
  if (requests.isPending) return <Loading />;
  if (requests.isError) return <RetryNotice error={requests.error} onRetry={() => { void requests.refetch(); }} />;
  const open = pendingRequests(requests.data.items);
  const conflict = decide.error instanceof ApiError && decide.error.status === 409;
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("guests.requests.intro")}</Text>
      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}
      {decide.isError && !conflict ? <FailureNotice error={decide.error} /> : null}
      {open.length === 0 ? <Notice>{t("guests.requests.empty")}</Notice> : open.map((request) => (
        <RequestCard key={request.id} request={request} celebrationId={celebrationId} busy={pendingId === request.id ? (decide.variables?.decision ?? null) : null} locked={pendingId !== null}
          onDecide={(decision) => resolve(request, decision)} onOpen={() => onNavigate(withCelebration(guestDetailPath(request.guestId), celebrationId))} />
      ))}
    </View>
  );
}

export function RequestsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="requests" title={t("guests.requests.title")}>{({ celebration }) => <RequestsBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
