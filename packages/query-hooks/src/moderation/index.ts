import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import type { CelebrationComponents, TemplateMediaComponents } from "@rsvp/contracts";

/**
 * F7 moderation (Celebration 1.8.0 and Template/Media 1.9.0, provisional: re-vendor from the official branch when BE #167 merges).
 * The types are the contract's own, so a renamed field breaks `tsc` here. Two audiences:
 *  - the public guest sends a report (no session, see `submitPublicReport`);
 *  - the administrator reads the queue and looks at a hidden file with a link that works once (see `useHiddenAssetPreview`).
 * The host's own «Moderación» screen (what was hidden, appeal) is not built yet: it waits for Pablo's answer in the PR.
 */
type C = CelebrationComponents["schemas"];
type T = TemplateMediaComponents["schemas"];

export type ReportReason = C["ReportReason"];
export type ReportStatus = C["ReportStatus"];
export type ElementRef = C["ElementRef"];
export type ReportInput = C["ReportInput"];
export type ReceivedReport = C["ReceivedReport"];
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

export type PreviewFailureKey = "notHidden" | "notQuarantined" | "notFound" | "forbidden" | "generic";
/** 409 ASSET_NOT_HIDDEN / ASSET_NOT_QUARANTINED, 404, 403. */
export function previewFailure(error: unknown): PreviewFailureKey {
  if (!(error instanceof ApiError)) return "generic";
  if (error.status === 403 || error.status === 401) return "forbidden";
  if (error.status === 404) return "notFound";
  if (error.status === 409) return error.problem?.code === "ASSET_NOT_QUARANTINED" ? "notQuarantined" : error.problem?.code === "ASSET_NOT_HIDDEN" ? "notHidden" : "generic";
  return "generic";
}

// ---- Administrator: the queue, one report with its trail, and the preview of a hidden file
const FRESH = { staleTime: 5_000, gcTime: 60_000 } as const;
export const adminReportKeys = {
  all: ["admin", "reports"] as const,
  list: (status: ReportStatus) => ["admin", "reports", "list", status] as const,
  detail: (id: string) => ["admin", "reports", "detail", id] as const
} as const;

/** The largest page the contract accepts. The queue is oldest first, so a full page means newer reports may exist beyond it. */
export const REPORT_QUEUE_LIMIT = 100;

export function useAdminReports(client: ApiClient, status: ReportStatus = "OPEN") {
  return useQuery({ queryKey: adminReportKeys.list(status), queryFn: () => client.request<{ readonly items: readonly AdminReport[] }>(`/celebrations/admin/reports?status=${status}&limit=${REPORT_QUEUE_LIMIT}`), ...FRESH });
}

export function useAdminReport(client: ApiClient, reportId: string) {
  return useQuery({ queryKey: adminReportKeys.detail(reportId), queryFn: () => client.request<ReportDetail>(`/celebrations/admin/reports/${encodeURIComponent(reportId)}`), ...FRESH, enabled: Boolean(reportId) });
}

/**
 * POST /media/admin/assets/{id}/preview-links (ADMIN). The link works ONCE and for five minutes, so it is a one-shot mutation result:
 * never a query (a query would be cached and refetched, and a second use is a 404), never stored, `gcTime: 0`, and the caller keeps it
 * in component state only until it is used or `expiresAt`. `retry: false` is said here, not left to defaults: a client-wide mutation
 * retry would issue extra single-use links nobody asked for (the only re-send is api-client's one after a token refresh). A 409 `ASSET_NOT_QUARANTINED` means the bytes are still moving: retry shortly.
 */
export function useHiddenAssetPreview(client: ApiClient) {
  return useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: (assetId: string) => client.request<HiddenAssetPreviewLink, Record<string, never>>(`/media/admin/assets/${encodeURIComponent(assetId)}/preview-links`, { method: "POST", body: {} })
  });
}
