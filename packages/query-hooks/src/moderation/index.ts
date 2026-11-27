import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import type { CelebrationComponents, TemplateMediaComponents } from "@rsvp/contracts";
import { cachePolicy, retryTransient } from "../policy.js";
import { queryKeys } from "../keys.js";

/**
 * F7 moderation (Celebration 1.8.0 and Template/Media 1.9.0, provisional: re-vendor from the official branch when BE #167 merges).
 * The types are the contract's own, so a renamed field breaks `tsc` here. Three audiences:
 *  - the public guest sends a report (no session, see `submitPublicReport`);
 *  - the host reads what was hidden and appeals once per decision;
 *  - the administrator reads the queue and looks at a hidden file with a link that works once (see `useHiddenAssetPreview`).
 */
type C = CelebrationComponents["schemas"];
type T = TemplateMediaComponents["schemas"];

export type ReportReason = C["ReportReason"];
export type ReportStatus = C["ReportStatus"];
export type ElementRef = C["ElementRef"];
export type ReportInput = C["ReportInput"];
export type ReceivedReport = C["ReceivedReport"];
export type HostTakedown = C["HostTakedown"];
export type AdminReport = C["AdminReport"];
export type ReportDetail = C["ReportDetail"];
export type Takedown = C["Takedown"];
export type ModerationAuditEntry = C["ModerationAuditEntry"];
export type HiddenAssetPreviewLink = T["HiddenAssetPreviewLink"];

/** The closed list of reasons, in the order the contract names them. The server refuses anything else (422 INVALID_REPORT_REASON). */
export const REPORT_REASONS: readonly ReportReason[] = ["SEXUAL_CONTENT", "VIOLENCE_OR_HATE", "SCAM_OR_IMPERSONATION", "COPYRIGHT", "PERSONAL_DATA", "SPAM", "OTHER"];
export const REPORT_STATUSES: readonly ReportStatus[] = ["OPEN", "DISMISSED", "ACTIONED"];
export const REPORT_COMMENT_MAX = 1000;
/** `SECTION music` is the own music (MP3): the only reserved element. Hiding it leaves the invitation and its photos visible. */
export const MUSIC_ELEMENT: ElementRef = { kind: "SECTION", id: "music" };

export type HiddenScope = "PAGE" | "MUSIC" | "ELEMENT";
/** What a decision hid, as the host reads it: the whole page, only the music, or one element. */
export function hiddenScope(takedown: Pick<HostTakedown, "scope" | "element">): HiddenScope {
  if (takedown.scope === "PAGE") return "PAGE";
  return takedown.element?.kind === "SECTION" && takedown.element.id === MUSIC_ELEMENT.id ? "MUSIC" : "ELEMENT";
}

export interface ReportDraft { readonly reason: ReportReason; readonly comment: string; readonly element?: ElementRef | null }

/** What is wrong with a draft before it is sent, in the order the form shows it; null when it can be sent. */
export function reportDraftProblem(draft: Pick<ReportDraft, "reason" | "comment"> | { readonly reason: ReportReason | null; readonly comment: string }): "reasonRequired" | "commentRequired" | "commentTooLong" | null {
  if (!draft.reason) return "reasonRequired";
  const comment = draft.comment.trim();
  if (draft.reason === "OTHER" && !comment) return "commentRequired";
  return comment.length > REPORT_COMMENT_MAX ? "commentTooLong" : null;
}

/** The body of POST /celebrations/public/{slug}/reports: whitespace only counts as no comment; no element means the whole page. */
export function reportBody(draft: ReportDraft): ReportInput {
  const comment = draft.comment.trim();
  return { reason: draft.reason, ...(comment ? { comment } : {}), ...(draft.element ? { element: draft.element } : {}) };
}

/** Anonymous: no session, no cache. Limited per client and per celebration (429 + Retry-After, which `ApiError` carries). */
export const submitPublicReport = (client: ApiClient, slug: string, draft: ReportDraft) =>
  client.request<ReceivedReport, ReportInput>(`/celebrations/public/${encodeURIComponent(slug)}/reports`, { method: "POST", auth: false, body: reportBody(draft) });

export type ReportFailureKey = "invalidText" | "commentRequired" | "commentTooLong" | "notFound" | "elementGone" | "tooMany" | "tooManyLater" | "offline" | "generic";
export interface ReportFailure { readonly key: ReportFailureKey; /** Whole minutes to wait, for `tooMany`. */ readonly minutes?: number }

/** Why a report was refused, in the words of the contract's closed list of problems. Nothing internal reaches the guest; a thrown non-API error is a lost connection. */
export function reportFailure(error: unknown): ReportFailure {
  if (!(error instanceof ApiError)) return { key: "offline" };
  const code = error.problem?.code;
  if (error.status === 404) return { key: "notFound" };
  if (error.status === 429) return error.retryAfterSeconds ? { key: "tooMany", minutes: Math.max(1, Math.ceil(error.retryAfterSeconds / 60)) } : { key: "tooManyLater" };
  if (error.status === 422) {
    if (code === "INVALID_TEXT_CHARACTER") return { key: "invalidText" };
    if (code === "REPORT_COMMENT_REQUIRED") return { key: "commentRequired" };
    if (code === "REPORT_COMMENT_TOO_LONG") return { key: "commentTooLong" };
    if (code === "ELEMENT_NOT_FOUND") return { key: "elementGone" };
  }
  return { key: "generic" };
}

export type AppealFailureKey = "used" | "notActive" | "readOnly" | "generic";
/** 409 APPEAL_ALREADY_USED / TAKEDOWN_NOT_ACTIVE, 403 read-only actor. The message length is checked in the form, so a 422 is unexpected and reads as generic. */
export function appealFailure(error: unknown): AppealFailureKey {
  if (!(error instanceof ApiError)) return "generic";
  if (error.status === 403) return "readOnly";
  if (error.status === 409) return error.problem?.code === "APPEAL_ALREADY_USED" ? "used" : error.problem?.code === "TAKEDOWN_NOT_ACTIVE" ? "notActive" : "generic";
  return "generic";
}

export type PreviewFailureKey = "notHidden" | "notQuarantined" | "notFound" | "forbidden" | "generic";
/** 409 ASSET_NOT_HIDDEN / ASSET_NOT_QUARANTINED, 404, 403. */
export function previewFailure(error: unknown): PreviewFailureKey {
  if (!(error instanceof ApiError)) return "generic";
  if (error.status === 403 || error.status === 401) return "forbidden";
  if (error.status === 404) return "notFound";
  if (error.status === 409) return error.problem?.code === "ASSET_NOT_QUARANTINED" ? "notQuarantined" : error.problem?.code === "ASSET_NOT_HIDDEN" ? "notHidden" : "generic";
  return "generic";
}

// ---- Host: what was hidden, and the appeal (once per decision)
export const hostModerationKey = (celebrationId: string) => [...queryKeys.celebration.detail(celebrationId), "moderation"] as const;

export function useHostModeration(client: ApiClient, celebrationId: string) {
  return useQuery({
    queryKey: hostModerationKey(celebrationId),
    queryFn: ({ signal }) => client.request<{ readonly items: readonly HostTakedown[] }>(`/celebrations/${encodeURIComponent(celebrationId)}/moderation`, { signal }),
    ...cachePolicy.celebration, retry: retryTransient, enabled: Boolean(celebrationId)
  });
}

export function useAppealTakedown(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ takedownId, message }: { readonly takedownId: string; readonly message: string }) =>
      client.request<HostTakedown, { readonly message: string }>(`/celebrations/${encodeURIComponent(celebrationId)}/takedowns/${encodeURIComponent(takedownId)}/appeal`, { method: "POST", body: { message: message.trim() } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hostModerationKey(celebrationId) })
  });
}

// ---- Administrator: the queue, one report with its trail, and the preview of a hidden file
const FRESH = { staleTime: 5_000, gcTime: 60_000 } as const;
export const adminReportKeys = {
  all: ["admin", "reports"] as const,
  list: (status: ReportStatus) => ["admin", "reports", "list", status] as const,
  detail: (id: string) => ["admin", "reports", "detail", id] as const
} as const;

export function useAdminReports(client: ApiClient, status: ReportStatus = "OPEN") {
  return useQuery({ queryKey: adminReportKeys.list(status), queryFn: () => client.request<{ readonly items: readonly AdminReport[] }>(`/celebrations/admin/reports?status=${status}&limit=100`), ...FRESH });
}

export function useAdminReport(client: ApiClient, reportId: string) {
  return useQuery({ queryKey: adminReportKeys.detail(reportId), queryFn: () => client.request<ReportDetail>(`/celebrations/admin/reports/${encodeURIComponent(reportId)}`), ...FRESH, enabled: Boolean(reportId) });
}

/**
 * POST /media/admin/assets/{id}/preview-links (ADMIN). The link works ONCE and for five minutes, so it is a one-shot mutation result:
 * never a query (a query would be cached and refetched, and a second use is a 404), never stored, `gcTime: 0`, and the caller keeps it
 * in component state only until it is used or `expiresAt`. A 409 `ASSET_NOT_QUARANTINED` means the bytes are still moving: retry shortly.
 */
export function useHiddenAssetPreview(client: ApiClient) {
  return useMutation({
    gcTime: 0,
    mutationFn: (assetId: string) => client.request<HiddenAssetPreviewLink, Record<string, never>>(`/media/admin/assets/${encodeURIComponent(assetId)}/preview-links`, { method: "POST", body: {} })
  });
}
