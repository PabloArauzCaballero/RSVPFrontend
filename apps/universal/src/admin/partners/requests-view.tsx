import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { Chip, FilterSelect, type ChipTone } from "@rsvp/ui";
import { PARTNER_REQUEST_STATUSES, WITHDRAWN_BY_REQUESTER, type PartnerRequest, type PartnerRequestStatus } from "@rsvp/query-hooks";
import {
  OPEN_REQUEST_STATUSES, PARTNER_REQUEST_REASON_MAX, PARTNER_REQUESTS_PAGE_SIZE, useAdminPartnerRequests, useAdminUsersByIds, useConvertPartnerRequest, useRejectPartnerRequest, useTakePartnerRequest,
  type PartnerRequestFilters
} from "@rsvp/query-hooks/admin";
import { useApiClient, useT } from "../../platform/providers";
import { useSingleMutation } from "../../platform/single-flight";
import { ActionButton, Field, Notice, OverflowMenu, useStyles } from "../../host/ui";
import { AdminErrorNotice, ReasonDialog, useStamp } from "../shared";
import { DataTable, type DataColumn } from "../data-table";
import { Paginator } from "../paginator";

/**
 * «Solicitudes» of the Partners tab (DPA-10): the queue of partner requests sent from the app. «Tomar» puts one in review,
 * «Rechazar» needs a reason the requester sees (up to 500), «Convertir en alta» creates the requester's intake on the server and
 * hands it to the partner wizard (`onOpenIntake`), exactly as «Continuar borrador» does, so the admin completes the KYP and commits.
 */

/** "pending" = OPEN + IN_REVIEW (the default: what still needs an answer), "all" = every status, or one status. */
type StatusFilter = "pending" | "all" | PartnerRequestStatus;
const MAX_QUERY = 120;
const CODED = ["PARTNER_REQUEST_VERSION_CONFLICT", "INVALID_REQUEST_TRANSITION", "PARTNER_REQUEST_NOT_FOUND", "REASON_REQUIRED", "REASON_TOO_LONG"];
/** Codes that mean "what you see is stale": the notice offers to reload the list. */
const STALE = ["PARTNER_REQUEST_VERSION_CONFLICT", "INVALID_REQUEST_TRANSITION", "PARTNER_REQUEST_NOT_FOUND"];
export const REQUEST_STATUS_TONE: Readonly<Record<PartnerRequestStatus | "WITHDRAWN", ChipTone>> = { OPEN: "wait", IN_REVIEW: "maybe", CONVERTED: "yes", REJECTED: "no", WITHDRAWN: "wait" };

export const statusesOf = (filter: StatusFilter): readonly PartnerRequestStatus[] => (filter === "pending" ? OPEN_REQUEST_STATUSES : filter === "all" ? [] : [filter]);
const stateOf = (request: PartnerRequest): PartnerRequestStatus | "WITHDRAWN" => (request.status === "REJECTED" && request.statusReason === WITHDRAWN_BY_REQUESTER ? "WITHDRAWN" : request.status);
const codeOf = (error: unknown): string => (error instanceof ApiError ? error.problem?.code ?? "" : "");

/** The badge of the «Solicitudes» sub-tab: OPEN + IN_REVIEW of the whole queue (`counts`), read with the default filter. */
export function usePendingRequestCount(): number | undefined {
  const counts = useAdminPartnerRequests(useApiClient(), { statuses: OPEN_REQUEST_STATUSES }).data?.counts;
  return counts ? counts.OPEN + counts.IN_REVIEW : undefined;
}

function ActionFailure({ error, onReload }: { readonly error: unknown; readonly onReload: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  if (!error) return null;
  const code = codeOf(error);
  if (!CODED.includes(code)) return <AdminErrorNotice error={error} onReload={onReload} />;
  return (
    <Notice kind="error">
      <Text style={styles.body} testID="request-action-error">{t(`admin.partners.requests.codes.${code}`)}</Text>
      {STALE.includes(code) ? <ActionButton icon="refresh" variant="secondary" label={t("admin.partners.requests.reload")} onPress={onReload} testID="requests-reload" /> : null}
    </Notice>
  );
}

export function PartnerRequestsView({ categoryName, cityName, onOpenIntake }: {
  readonly categoryName: (code: string) => string; readonly cityName: (code: string) => string;
  /** Opens the partner wizard on an intake (the one «Convertir en alta» just created, or the one a converted request points at). */
  readonly onOpenIntake: (intakeId: string) => void;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const stamp = useStamp();
  const client = useApiClient();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [tooLong, setTooLong] = useState(false);
  const [page, setPage] = useState(0);
  const [rejecting, setRejecting] = useState<PartnerRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const filters: PartnerRequestFilters = { statuses: statusesOf(status), ...(q ? { q } : {}), ...(page ? { page } : {}) };
  const list = useAdminPartnerRequests(client, filters);
  const rows = list.data?.items;
  const people = useAdminUsersByIds(client, (rows ?? []).map((row) => row.requesterUserId));
  const take = useTakePartnerRequest(client);
  const reject = useRejectPartnerRequest(client);
  const convert = useConvertPartnerRequest(client);
  const takeOnce = useSingleMutation(take);
  const rejectOnce = useSingleMutation(reject);
  const convertOnce = useSingleMutation(convert);
  const failure = take.error ?? reject.error ?? convert.error;
  const reset = (): void => { setNotice(null); take.reset(); reject.reset(); convert.reset(); };
  const search = (): void => { if (text.trim().length > MAX_QUERY) { setTooLong(true); return; } setTooLong(false); setPage(0); setQ(text.trim()); };
  const filtered = status !== "pending" || q !== "";

  const columns: readonly DataColumn<PartnerRequest>[] = [
    { key: "business", header: t("admin.partners.requests.columns.business"), primary: true, flex: 2, render: (row) => (
      <View style={{ gap: 2 }}>
        <Text style={[styles.itemTitle, { overflowWrap: "anywhere" } as object]}>{row.businessName}</Text>
        {row.message ? <Text style={styles.muted} numberOfLines={2}>{row.message}</Text> : null}
      </View>
    ) },
    { key: "category", header: t("admin.partners.requests.columns.category"), flex: 1.2, render: (row) => categoryName(row.categoryCode) },
    { key: "city", header: t("admin.partners.requests.columns.city"), flex: 1.2, render: (row) => cityName(row.cityCode) },
    { key: "contact", header: t("admin.partners.requests.columns.contact"), flex: 1.6, render: (row) => t("admin.partners.requests.contact", { channel: t(`admin.partners.requests.channels.${row.contactChannel}`), phone: row.contactPhone }) },
    { key: "requester", header: t("admin.partners.requests.columns.requester"), flex: 2, render: (row) => people.data?.get(row.requesterUserId)?.email ?? t("admin.partners.unknownUser") },
    { key: "status", header: t("admin.partners.requests.columns.status"), flex: 1.2, render: (row) => (
      <View style={{ gap: 2 }}>
        <Chip tone={REQUEST_STATUS_TONE[stateOf(row)]}>{t(`admin.partners.requests.statuses.${stateOf(row)}`)}</Chip>
        {stateOf(row) === "REJECTED" && row.statusReason ? <Text style={styles.muted} numberOfLines={2}>{t("admin.common.reasonOn", { reason: row.statusReason })}</Text> : null}
      </View>
    ) },
    { key: "created", header: t("admin.partners.requests.columns.created"), flex: 1.4, render: (row) => stamp(row.createdAt) }
  ];

  const rowActions = (row: PartnerRequest): ReactNode => {
    const open = row.status === "OPEN" || row.status === "IN_REVIEW";
    const items = [
      ...(row.status === "OPEN" ? [{ key: "take", label: t("admin.partners.requests.actions.take"), onPress: () => { reset(); takeOnce({ requestId: row.id, version: row.version }, { onSuccess: () => setNotice(t("admin.partners.requests.done.taken", { name: row.businessName })) }); }, testID: `request-take-${row.id}` }] : []),
      ...(open ? [
        { key: "convert", label: t("admin.partners.requests.actions.convert"), onPress: () => { reset(); convertOnce({ requestId: row.id, version: row.version }, { onSuccess: ({ intake }) => { setNotice(t("admin.partners.requests.done.converted", { name: row.businessName })); onOpenIntake(intake.id); } }); }, testID: `request-convert-${row.id}` },
        { key: "reject", label: t("admin.partners.requests.actions.reject"), destructive: true, onPress: () => { reset(); setRejecting(row); }, testID: `request-reject-${row.id}` }
      ] : []),
      ...(row.status === "CONVERTED" && row.convertedIntakeId ? [{ key: "intake", label: t("admin.partners.requests.actions.openIntake"), onPress: () => { reset(); onOpenIntake(row.convertedIntakeId ?? ""); }, testID: `request-intake-${row.id}` }] : [])
    ];
    return items.length ? <OverflowMenu label={t("admin.partners.requests.actions.menu", { name: row.businessName })} testID={`request-menu-${row.id}`} items={items} /> : null;
  };

  const statusOptions: readonly { readonly value: StatusFilter; readonly label: string }[] = [
    { value: "pending", label: t("admin.partners.requests.filters.pending") }, { value: "all", label: t("admin.partners.requests.filters.all") },
    ...PARTNER_REQUEST_STATUSES.map((value) => ({ value, label: t(`admin.partners.requests.statuses.${value}`) }))
  ];
  const clear = (): void => { setStatus("pending"); setText(""); setQ(""); setPage(0); setTooLong(false); };
  return (
    <View style={{ gap: spacing[6] }} testID="partner-requests">
      <Text style={styles.body}>{t("admin.partners.requests.intro")}</Text>
      {notice ? <Notice kind="success">{notice}</Notice> : null}
      <ActionFailure error={failure} onReload={() => { reset(); void list.refetch(); }} />
      <View role="group" aria-label={t("admin.partners.requests.filters.label")} style={{ gap: spacing[3] }}>
        <Field label={t("admin.partners.requests.filters.q")} help={t("admin.partners.requests.filters.qHelp")} value={text} onChange={setText} onSubmit={search} testID="requests-q"
          trailing={<ActionButton icon="search" variant="secondary" label={t("admin.partners.requests.filters.search")} onPress={search} testID="requests-search" />}
          {...(tooLong ? { error: t("admin.partners.codes.TOO_LONG") } : {})} />
        <View style={{ gap: spacing[1], alignItems: "flex-start" }}>
          <Text style={styles.label}>{t("admin.partners.requests.filters.status")}</Text>
          <FilterSelect label={t("admin.partners.requests.filters.status")} value={status} onChange={(value) => { setPage(0); setStatus(value as StatusFilter); }} options={statusOptions} testID="requests-status" />
        </View>
      </View>
      {list.data ? <Text role="status" style={styles.muted} testID="requests-total">{t("admin.partners.requests.total", { count: list.data.total })}</Text> : null}
      <DataTable label={t("admin.partners.requests.title")} columns={columns} rows={rows} rowKey={(row) => row.id} actions={rowActions}
        loading={list.isPending} refreshing={list.isFetching && list.isPlaceholderData} error={list.error} onRetry={() => { void list.refetch(); }}
        emptyTitle={t(filtered ? "admin.partners.requests.empty.filteredTitle" : "admin.partners.requests.empty.title")} emptyBody={t(filtered ? "admin.partners.requests.empty.filtered" : "admin.partners.requests.empty.body")}
        {...(filtered ? { emptyAction: <ActionButton icon="close" variant="secondary" label={t("admin.partners.requests.filters.clear")} onPress={clear} testID="requests-clear" /> } : {})}
        illustration="provider" testID="requests-table" />
      {list.data ? <Paginator page={list.data.page} pageSize={PARTNER_REQUESTS_PAGE_SIZE} total={list.data.total} disabled={list.isFetching} onChange={setPage} testID="requests-pages" /> : null}
      <ReasonDialog visible={rejecting !== null} maxLength={PARTNER_REQUEST_REASON_MAX} title={rejecting ? t("admin.partners.requests.reject.title", { name: rejecting.businessName }) : ""} body={t("admin.partners.requests.reject.body")}
        confirmLabel={t("admin.partners.requests.actions.reject")} onCancel={() => setRejecting(null)}
        onConfirm={(reason) => { const current = rejecting; setRejecting(null); if (current) rejectOnce({ requestId: current.id, version: current.version, reason }, { onSuccess: () => setNotice(t("admin.partners.requests.done.rejected", { name: current.businessName })) }); }} />
    </View>
  );
}
