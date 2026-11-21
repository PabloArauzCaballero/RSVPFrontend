import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";

/**
 * Partner administration (A24): the admin creates partners through a server-side intake and manages them from a table.
 * Hand-written copies of provider-catalog 2.5.0 (`/providers/admin/intakes*`, `/providers/admin/partners*`,
 * `/providers/admin/documents/{id}/download`) and identity 1.2.0 (`GET /identity/admin/users?email=|ids=`), as published
 * in RSVPBackend PR #42 (@ 030e8eb for the duplicate-NIT warning and the change-owner body). Every route is ADMIN-only on the
 * server (requireAdmin per endpoint).
 */

export type PersonType = "NATURAL" | "UNIPERSONAL" | "JURIDICA";
export type KypStatus = "COMPLETE" | "PENDING" | "EXPIRING" | "EXPIRED";
export type PartnerOrigin = "ADMIN" | "SELF_SERVICE";
export type PartnerStatus = "DRAFT" | "PENDING_VERIFICATION" | "VERIFIED" | "SUSPENDED" | "REJECTED";
export type CiExtension = "LP" | "CB" | "SC" | "OR" | "PT" | "CH" | "TJ" | "BE" | "PD";
export type KypDocumentKind = "IDENTITY" | "BUSINESS_REGISTRATION" | "TAX_ID" | "ADDRESS_PROOF" | "POWER_OF_ATTORNEY" | "BANK_CERTIFICATE" | "OTHER";
export type DocumentReview = "PENDING" | "ACCEPTED" | "REJECTED";
export type IntakeStatus = "OPEN" | "COMMITTED" | "DISCARDED";
export type PartnerSort = "name" | "-createdAt" | "-updatedAt" | "kypStatus";
export const PARTNER_STATUSES: readonly PartnerStatus[] = ["DRAFT", "PENDING_VERIFICATION", "VERIFIED", "SUSPENDED", "REJECTED"];
export const KYP_STATUSES: readonly KypStatus[] = ["COMPLETE", "PENDING", "EXPIRING", "EXPIRED"];
export const PARTNER_ORIGINS: readonly PartnerOrigin[] = ["ADMIN", "SELF_SERVICE"];
export const PARTNER_SORTS: readonly PartnerSort[] = ["name", "-createdAt", "-updatedAt", "kypStatus"];
export const PARTNERS_PAGE_SIZE = 25;

export interface PartnerIdentity { readonly name?: string; readonly slug?: string; readonly categoryCodes?: readonly string[]; readonly description?: string; readonly plan?: string }
export interface PartnerContact { readonly whatsapp?: string; readonly phone?: string; readonly publicEmail?: string; readonly website?: string; readonly social?: { readonly instagram?: string; readonly facebook?: string; readonly tiktok?: string } }
export interface PartnerCoverage { readonly departmentCode?: string; readonly cityCode?: string; readonly zoneCodes?: readonly string[] }
export interface PartnerKyp {
  readonly personType?: PersonType;
  readonly legalName?: string;
  readonly nit?: string;
  readonly seprecRegistration?: string;
  readonly seprecDate?: string;
  readonly companyType?: string;
  readonly legalAddress?: { readonly departmentCode?: string; readonly cityCode?: string; readonly line?: string };
  /** `ciNumber` comes back masked (`****1234`) except on GET ?reveal=ci, which the server audits. */
  readonly representative?: { readonly fullName?: string; readonly ciNumber?: string; readonly ciExtension?: CiExtension; readonly ciComplement?: string; readonly ciExpiresOn?: string };
  readonly powerOfAttorney?: { readonly number?: string; readonly notary?: string; readonly date?: string };
  /** `accountNumber` is always masked in responses. */
  readonly bankAccount?: { readonly bank?: string; readonly accountNumber?: string; readonly holder?: string; readonly currency?: "BOB" | "USD" };
}
/** PATCH body of an intake or a partner: each section given replaces the stored one. */
export interface PartnerSections { readonly identity?: PartnerIdentity; readonly contact?: PartnerContact; readonly coverage?: PartnerCoverage; readonly kyp?: PartnerKyp; readonly representativeInRegistration?: boolean }
export type SectionName = "identity" | "contact" | "coverage" | "kyp";
/** Per-section business-rule problems of a draft: `{ kyp: { nit: "INVALID_NIT" } }`. The draft is saved anyway. */
export type SectionErrors = Readonly<Record<SectionName, Readonly<Record<string, string>>>>;

export interface IntakeDocument { readonly id: string; readonly intakeId: string; readonly kind: KypDocumentKind; readonly fileName: string; readonly contentType: string; readonly sizeBytes: number; readonly status: "PENDING_UPLOAD" | "UPLOADED"; readonly createdAt: string; readonly uploadedAt?: string }
/** Another partner whose KYP already uses the same NIT. Allowed after an explicit confirmation: two partners may belong to one company. */
export interface NitMatch { readonly providerId: string; readonly name: string; readonly slug: string | null }
/** Non-blocking warnings of an OPEN intake: `{}` or `{ nitInUse: [...] }`. With `nitInUse` the commit needs `acknowledgeDuplicateNit: true` (else 409 NIT_IN_USE). */
export interface IntakeWarnings { readonly nitInUse?: readonly NitMatch[] }
export interface Intake extends PartnerSections {
  readonly id: string; readonly status: IntakeStatus; readonly ownerUserId: string; readonly documents: readonly IntakeDocument[];
  readonly fieldErrors: SectionErrors; readonly providerId?: string; readonly createdBy: string; readonly createdAt: string; readonly updatedAt: string;
  /** Required since 030e8eb; optional here so an older server (or a test fixture) without it reads as "no warnings". */
  readonly warnings?: IntakeWarnings;
}
export interface IntakeSummary { readonly id: string; readonly status: IntakeStatus; readonly ownerUserId: string; readonly name: string | null; readonly slug: string | null; readonly createdBy: string; readonly createdAt: string; readonly updatedAt: string }

export interface PartnerDocument {
  readonly id: string; readonly providerId: string; readonly kind: string; readonly fileName: string; readonly contentType: string; readonly sizeBytes: number;
  readonly status: "PENDING_UPLOAD" | "UPLOADED"; readonly createdAt: string; readonly uploadedAt?: string;
  readonly reviewStatus: DocumentReview; readonly reviewReason: string | null; readonly reviewedBy: string | null; readonly reviewedAt: string | null;
}
export interface AuditEntry { readonly action: string; readonly actorId: string; readonly reason: string | null; readonly detail: Readonly<Record<string, unknown>>; readonly occurredAt: string }
export interface PartnerRow {
  readonly id: string; readonly name: string; readonly slug: string | null; readonly status: PartnerStatus; readonly kypStatus: KypStatus; readonly origin: PartnerOrigin; readonly personType: PersonType | null;
  readonly ownerUserId: string; readonly categoryCode: string | null; readonly cityCode: string | null; readonly publishedListings: number; readonly plan: string;
  readonly createdAt: string; readonly updatedAt: string; readonly createdBy: string | null; readonly kypReviewDueAt: string | null;
}
export interface PartnerPage { readonly items: readonly PartnerRow[]; readonly page: number; readonly pageSize: number; readonly total: number }
export interface PartnerDetail {
  readonly id: string; readonly name: string; readonly slug: string | null; readonly status: PartnerStatus; readonly kypStatus: KypStatus; readonly origin: PartnerOrigin; readonly personType: PersonType | null;
  readonly ownerUserId: string; readonly plan: string; readonly version: number; readonly statusReason: string | null; readonly createdAt: string; readonly updatedAt: string; readonly createdBy: string | null;
  readonly kypCompletedAt: string | null; readonly kypReviewDueAt: string | null;
  readonly identity: { readonly name: string; readonly slug: string | null; readonly categoryCodes: readonly string[]; readonly description: string | null; readonly plan: string };
  readonly contact: PartnerContact; readonly coverage: PartnerCoverage; readonly kyp: PartnerKyp | null; readonly representativeInRegistration: boolean;
  readonly documents: readonly PartnerDocument[]; readonly publishedListings: number; readonly audit: readonly AuditEntry[];
}
/** 200 of change-owner: the partner after the change plus how many other partners the previous owner still owns (0 = revoke PROVIDER). */
export interface PartnerOwnerChange extends PartnerDetail { readonly previousOwnerStillOwns: number }
export interface ChangeOwnerInput { readonly providerId: string; readonly newOwnerUserId: string; readonly reason: string; readonly version: number }
/** `POST .../documents`: PUT the bytes to `uploadUrl` with exactly this `method` and these `headers`, then complete. */
export interface KypDocumentUpload { readonly documentId: string; readonly uploadUrl: string; readonly method: "PUT"; readonly headers: Readonly<Record<string, string>>; readonly expiresAt: string }
export interface KypDocumentInput { readonly kind: KypDocumentKind; readonly fileName: string; readonly contentType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp"; readonly sizeBytes: number }
export interface AdminDocumentDownload { readonly documentId: string; readonly kind: KypDocumentKind; readonly url: string; readonly expiresAt: string }
/** The bytes transfer is injected: the screen knows how to read the picked file (a File on web, a Blob on native). */
export type PutObject = (target: { readonly url: string; readonly method: "PUT"; readonly headers: Readonly<Record<string, string>> }) => Promise<void>;

/** GET /providers/geo: Bolivia's cities, each with its department. Department and city pickers are built from it. */
export interface GeoCity { readonly slug: string; readonly name: string; readonly department: string; readonly departmentCode: string; readonly capital?: boolean }
export interface GeoList { readonly country?: string; readonly items: readonly GeoCity[] }

export interface IdentityUser { readonly id: string; readonly email: string; readonly roles: readonly string[]; readonly status: "ACTIVE" | "SUSPENDED"; readonly createdAt: string }

export interface PartnerFilters {
  readonly q?: string; readonly status?: PartnerStatus; readonly kypStatus?: KypStatus; readonly categoryCode?: string; readonly cityCode?: string;
  readonly personType?: PersonType; readonly origin?: PartnerOrigin; readonly plan?: string; readonly kypExpiringWithinDays?: number;
  readonly createdFrom?: string; readonly createdTo?: string; readonly hasPublishedListings?: boolean; readonly sort?: PartnerSort; readonly page?: number;
}

export const partnerKeys = {
  all: ["admin", "partners"] as const,
  list: (path: string) => ["admin", "partners", "list", path] as const,
  lists: ["admin", "partners", "list"] as const,
  detail: (id: string) => ["admin", "partners", "detail", id] as const,
  revealed: (id: string) => ["admin", "partners", "detail", id, "reveal-ci"] as const,
  intakes: ["admin", "intakes"] as const,
  openIntakes: ["admin", "intakes", "open"] as const,
  intake: (id: string) => ["admin", "intakes", id] as const,
  usersByIds: (ids: string) => ["admin", "users", "ids", ids] as const,
  userByEmail: (email: string) => ["admin", "users", "email", email] as const,
  geo: ["providers", "geo"] as const
} as const;

const FRESH = { staleTime: 5_000, gcTime: 60_000 } as const;
const enc = encodeURIComponent;
const INTAKES = "/providers/admin/intakes";
const PARTNERS = "/providers/admin/partners";

/** GET /providers/admin/partners with only the filters that are set; page and pageSize always (server pagination, 25 per page). */
export function adminPartnersPath(filters: PartnerFilters): string {
  const params = new URLSearchParams();
  const put = (key: string, value: string | number | boolean | undefined): void => { if (value !== undefined && value !== "") params.append(key, String(value)); };
  put("q", filters.q?.trim());
  put("status", filters.status);
  put("kypStatus", filters.kypStatus);
  put("categoryCode", filters.categoryCode);
  put("cityCode", filters.cityCode);
  put("personType", filters.personType);
  put("origin", filters.origin);
  put("plan", filters.plan);
  put("kypExpiringWithinDays", filters.kypExpiringWithinDays);
  put("createdFrom", filters.createdFrom);
  put("createdTo", filters.createdTo);
  put("hasPublishedListings", filters.hasPublishedListings);
  put("sort", filters.sort ?? "-createdAt");
  put("page", filters.page ?? 0);
  put("pageSize", PARTNERS_PAGE_SIZE);
  return `${PARTNERS}?${params.toString()}`;
}

// ---- Commit idempotency: one key per intake, kept for the life of the app, so a retried or double-sent commit replays the same 201.
const commitKeys = new Map<string, string>();
const randomKey = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
/** The `Idempotency-Key` of an intake's commit: generated the first time and reused afterwards (`^[A-Za-z0-9_.:-]{1,128}$`). */
export function commitIdempotencyKey(intakeId: string, generate: () => string = randomKey): string {
  const known = commitKeys.get(intakeId);
  if (known) return known;
  const key = `commit:${generate()}`;
  commitKeys.set(intakeId, key);
  return key;
}

async function uploadDocument(client: ApiClient, base: string, input: KypDocumentInput, put: PutObject): Promise<string> {
  const upload = await client.request<KypDocumentUpload, KypDocumentInput>(`${base}/documents`, { method: "POST", body: input });
  await put({ url: upload.uploadUrl, method: upload.method, headers: upload.headers });
  return upload.documentId;
}

const refreshIntake = (queryClient: QueryClient, intakeId: string) => Promise.all([queryClient.invalidateQueries({ queryKey: partnerKeys.intake(intakeId) }), queryClient.invalidateQueries({ queryKey: partnerKeys.openIntakes })]);
const refreshPartner = (queryClient: QueryClient, providerId: string) => Promise.all([queryClient.invalidateQueries({ queryKey: partnerKeys.detail(providerId) }), queryClient.invalidateQueries({ queryKey: partnerKeys.lists })]);

// ---- Reference data
export function usePartnerGeo(client: ApiClient) {
  return useQuery({ queryKey: partnerKeys.geo, queryFn: () => client.request<GeoList>("/providers/geo", { auth: false }), staleTime: 300_000 });
}

// ---- Identity (1.2.0): one filter per call (query, email or ids); combining them answers 422.
/** Exact, case-insensitive e-mail lookup; `null` when no account has it. Runs only once an e-mail is submitted. */
export function useAdminUserByEmail(client: ApiClient, email: string) {
  const wanted = email.trim().toLowerCase();
  return useQuery({
    queryKey: partnerKeys.userByEmail(wanted),
    queryFn: async () => (await client.request<{ readonly items: readonly IdentityUser[] }>(`/identity/admin/users?${new URLSearchParams({ email: wanted, page: "0", size: "1" }).toString()}`)).items[0] ?? null,
    enabled: wanted !== "", ...FRESH, retry: false
  });
}
/** The owners of one page of partners (at most 100 ids), as a map id → user. */
export function useAdminUsersByIds(client: ApiClient, ids: readonly string[]) {
  const unique = [...new Set(ids.filter(Boolean))].sort().slice(0, 100);
  const joined = unique.join(",");
  return useQuery({
    queryKey: partnerKeys.usersByIds(joined),
    queryFn: async () => {
      const page = await client.request<{ readonly items: readonly IdentityUser[] }>(`/identity/admin/users?${new URLSearchParams({ ids: joined, page: "0", size: String(Math.max(1, unique.length)) }).toString()}`);
      return new Map(page.items.map((user) => [user.id, user] as const));
    },
    enabled: unique.length > 0, ...FRESH, retry: false
  });
}

// ---- Intakes
export function useCreateIntake(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ownerUserId: string) => client.request<Intake, { readonly ownerUserId: string }>(INTAKES, { method: "POST", body: { ownerUserId } }),
    onSuccess: (intake) => { queryClient.setQueryData(partnerKeys.intake(intake.id), intake); return queryClient.invalidateQueries({ queryKey: partnerKeys.openIntakes }); }
  });
}
export function useIntake(client: ApiClient, intakeId: string | undefined) {
  return useQuery({ queryKey: partnerKeys.intake(intakeId ?? ""), queryFn: () => client.request<Intake>(`${INTAKES}/${enc(intakeId ?? "")}`), enabled: Boolean(intakeId), ...FRESH, retry: false });
}
export function useOpenIntakes(client: ApiClient, enabled = true) {
  return useQuery({ queryKey: partnerKeys.openIntakes, queryFn: () => client.request<{ readonly items: readonly IntakeSummary[] }>(`${INTAKES}?status=OPEN`), enabled, ...FRESH, retry: false });
}
/** Autosave of one step: answers the whole intake with `fieldErrors`, which never block the save. */
export function usePatchIntake(client: ApiClient, intakeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sections: PartnerSections) => client.request<Intake, PartnerSections>(`${INTAKES}/${enc(intakeId)}`, { method: "PATCH", body: sections }),
    onSuccess: (intake) => { queryClient.setQueryData(partnerKeys.intake(intakeId), intake); return queryClient.invalidateQueries({ queryKey: partnerKeys.openIntakes }); }
  });
}
export function useDiscardIntake(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (intakeId: string) => client.request<undefined>(`${INTAKES}/${enc(intakeId)}`, { method: "DELETE" }), onSuccess: (_done, intakeId) => refreshIntake(queryClient, intakeId) });
}
/** Register → PUT to storage (the returned method and headers) → complete. */
export function useUploadIntakeDocument(client: ApiClient, intakeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, put }: { readonly input: KypDocumentInput; readonly put: PutObject }) => {
      const documentId = await uploadDocument(client, `${INTAKES}/${enc(intakeId)}`, input, put);
      return client.request<IntakeDocument>(`${INTAKES}/${enc(intakeId)}/documents/${enc(documentId)}/complete`, { method: "POST" });
    },
    onSettled: () => refreshIntake(queryClient, intakeId)
  });
}
export function useDeleteIntakeDocument(client: ApiClient, intakeId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (documentId: string) => client.request<undefined>(`${INTAKES}/${enc(intakeId)}/documents/${enc(documentId)}`, { method: "DELETE" }), onSettled: () => refreshIntake(queryClient, intakeId) });
}
/**
 * POST .../commit with `{ confirmReviewed: true }` and the intake's one Idempotency-Key. 201 = the partner exists, VERIFIED.
 * `acknowledgeDuplicateNit` is sent only when true: the admin confirmed a NIT that another partner uses (else 409 NIT_IN_USE).
 */
export function useCommitIntake(client: ApiClient, intakeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options?: { readonly acknowledgeDuplicateNit?: boolean }) => client.request<PartnerDetail, { readonly confirmReviewed: true; readonly acknowledgeDuplicateNit?: true }>(`${INTAKES}/${enc(intakeId)}/commit`, {
      method: "POST", body: { confirmReviewed: true, ...(options?.acknowledgeDuplicateNit ? { acknowledgeDuplicateNit: true as const } : {}) }, headers: { "Idempotency-Key": commitIdempotencyKey(intakeId) }
    }),
    onSuccess: (partner) => { queryClient.setQueryData(partnerKeys.detail(partner.id), partner); return Promise.all([queryClient.invalidateQueries({ queryKey: partnerKeys.lists }), refreshIntake(queryClient, intakeId)]); }
  });
}

// ---- Partners
export function useAdminPartners(client: ApiClient, filters: PartnerFilters) {
  const path = adminPartnersPath(filters);
  return useQuery({ queryKey: partnerKeys.list(path), queryFn: () => client.request<PartnerPage>(path), ...FRESH, placeholderData: (previous) => previous });
}
export function useAdminPartner(client: ApiClient, providerId: string | undefined) {
  return useQuery({ queryKey: partnerKeys.detail(providerId ?? ""), queryFn: () => client.request<PartnerDetail>(`${PARTNERS}/${enc(providerId ?? "")}`), enabled: Boolean(providerId), ...FRESH, retry: false });
}
/** GET ?reveal=ci: the representative's CI in clear. Audited by the server; only fetched when the admin asks for it. */
export function useRevealPartnerCi(client: ApiClient, providerId: string, enabled: boolean) {
  return useQuery({ queryKey: partnerKeys.revealed(providerId), queryFn: () => client.request<PartnerDetail>(`${PARTNERS}/${enc(providerId)}?reveal=ci`), enabled: enabled && Boolean(providerId), staleTime: 0, gcTime: 0, retry: false });
}
/**
 * Optimistic concurrency: `If-Match: <version>`; a stale version answers 409 PARTNER_VERSION_CONFLICT. A new `kyp.nit` that another
 * partner uses answers 409 NIT_IN_USE unless `acknowledgeDuplicateNit` is true (sent only then).
 */
export function usePatchPartner(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sections, version, acknowledgeDuplicateNit }: { readonly sections: PartnerSections; readonly version: number; readonly acknowledgeDuplicateNit?: boolean }) =>
      client.request<PartnerDetail, PartnerSections & { readonly acknowledgeDuplicateNit?: true }>(`${PARTNERS}/${enc(providerId)}`, { method: "PATCH", body: { ...sections, ...(acknowledgeDuplicateNit ? { acknowledgeDuplicateNit: true as const } : {}) }, headers: { "If-Match": String(version) } }),
    onSuccess: (partner) => { queryClient.setQueryData(partnerKeys.detail(providerId), partner); return queryClient.invalidateQueries({ queryKey: partnerKeys.lists }); }
  });
}
export function useUploadPartnerDocument(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, put }: { readonly input: KypDocumentInput; readonly put: PutObject }) => {
      const documentId = await uploadDocument(client, `${PARTNERS}/${enc(providerId)}`, input, put);
      return client.request<PartnerDocument>(`${PARTNERS}/${enc(providerId)}/documents/${enc(documentId)}/complete`, { method: "POST" });
    },
    onSettled: () => refreshPartner(queryClient, providerId)
  });
}
export function useDeletePartnerDocument(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (documentId: string) => client.request<undefined>(`${PARTNERS}/${enc(providerId)}/documents/${enc(documentId)}`, { method: "DELETE" }), onSettled: () => refreshPartner(queryClient, providerId) });
}
export function useReviewPartnerDocument(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, decision, reason }: { readonly documentId: string; readonly decision: "ACCEPTED" | "REJECTED"; readonly reason?: string }) =>
      client.request<PartnerDocument, { readonly decision: "ACCEPTED" | "REJECTED"; readonly reason?: string }>(`${PARTNERS}/${enc(providerId)}/documents/${enc(documentId)}/review`, { method: "POST", body: { decision, ...(reason ? { reason } : {}) } }),
    onSuccess: () => refreshPartner(queryClient, providerId)
  });
}
/** A short-lived presigned URL (5 minutes); the server audits `document.downloaded`. */
export function useAdminDocumentDownload(client: ApiClient) {
  return useMutation({ mutationFn: (documentId: string) => client.request<AdminDocumentDownload>(`/providers/admin/documents/${enc(documentId)}/download`) });
}
export type PartnerAction = "suspend" | "reactivate" | "kyp-complete";
/** suspend / reactivate (`{ reason }`, required) and kyp/complete (revalidates; KYP_INCOMPLETE otherwise). Change-owner has its own hook. */
export function usePartnerAction(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, action, reason }: { readonly providerId: string; readonly action: PartnerAction; readonly reason?: string }) => {
      const path = `${PARTNERS}/${enc(providerId)}/${action === "kyp-complete" ? "kyp/complete" : action}`;
      const body = action === "kyp-complete" ? undefined : { reason: reason ?? "" };
      return client.request<PartnerDetail, object | undefined>(path, { method: "POST", ...(body ? { body } : {}) });
    },
    onSuccess: (_partner, { providerId }) => refreshPartner(queryClient, providerId)
  });
}
/**
 * POST .../change-owner `{ newOwnerUserId, reason }` with `If-Match: <version>` (DPA-3). Behind the backend flag
 * PROVIDER_OWNER_CHANGE_ENABLED: while it is off every call answers 409 OWNER_CHANGE_UNAVAILABLE. Other answers: 422 SAME_OWNER,
 * REASON_REQUIRED, and 409 PARTNER_VERSION_CONFLICT. The server never calls Identity (B10): granting and revoking PROVIDER is the UI's job.
 */
export function useChangePartnerOwner(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, newOwnerUserId, reason, version }: ChangeOwnerInput) =>
      client.request<PartnerOwnerChange, { readonly newOwnerUserId: string; readonly reason: string }>(`${PARTNERS}/${enc(providerId)}/change-owner`, { method: "POST", body: { newOwnerUserId, reason }, headers: { "If-Match": String(version) } }),
    onSuccess: (partner, { providerId }) => { queryClient.setQueryData(partnerKeys.detail(providerId), partner); return queryClient.invalidateQueries({ queryKey: partnerKeys.lists }); }
  });
}
