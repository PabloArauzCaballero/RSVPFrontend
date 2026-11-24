import type { ApiClient } from "@rsvp/api-client";
import type { design } from "@rsvp/celebration-theme";
import type { Items } from "../celebration/types.js";

/**
 * Template/Media design storage (BE PR #135): the draft of a celebration's invitation, its published versions and the
 * host's private templates. Every write carries the draft version it edited as If-Match; a stale one answers 409
 * VERSION_CONFLICT, a missing one 428. Types are written by hand until the vendored contract (1.3.0) lands.
 */

export type DesignKind = "CELEBRATION" | "PRIVATE_TEMPLATE";

export interface DesignRecord {
  readonly id: string;
  readonly kind: DesignKind;
  readonly celebrationId: string | null;
  readonly name: string;
  /** Token of optimistic concurrency: send it as If-Match. */
  readonly draftVersion: number;
  readonly publishedVersion: number | null;
  readonly hasUnpublishedChanges: boolean;
  readonly document: design.DesignDocumentV2;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Contrast and other advisory findings of the last save (P19): they never block. */
  readonly warnings?: readonly design.DesignWarning[];
}

export interface DesignVersionSummary { readonly version: number; readonly label: string; readonly createdBy: string; readonly createdAt: string }
export interface DesignVersion extends DesignVersionSummary { readonly document?: design.DesignDocumentV2 }
export interface DesignPublishResult { readonly design: DesignRecord; readonly version: DesignVersionSummary }

/** Exactly one source for the first draft. */
export type DesignSource =
  | { readonly templateId: string }
  | { readonly fromDesignId: string }
  | { readonly document: design.DesignDocumentV2 };
export type CreateDesignInput = { readonly kind: DesignKind; readonly celebrationId?: string; readonly name: string } & DesignSource;

const ifMatch = (version: number): HeadersInit => ({ "if-match": `"${version}"` });
const BASE = "/media";

export function designApi(client: ApiClient) {
  return {
    create: (input: CreateDesignInput) => client.request<DesignRecord, CreateDesignInput>(`${BASE}/designs`, { method: "POST", body: input }),
    get: (id: string) => client.request<DesignRecord>(`${BASE}/designs/${id}`),
    forCelebration: (celebrationId: string) => client.request<DesignRecord>(`${BASE}/celebrations/${celebrationId}/design`),
    privateTemplates: () => client.request<Items<DesignRecord>>(`${BASE}/designs?kind=PRIVATE_TEMPLATE`),
    saveDraft: (id: string, draftVersion: number, document: design.DesignDocumentV2, signal?: AbortSignal) =>
      client.request<DesignRecord, { document: design.DesignDocumentV2 }>(`${BASE}/designs/${id}/draft`, { method: "PUT", headers: ifMatch(draftVersion), body: { document }, signal }),
    publish: (id: string, draftVersion: number, label: string) =>
      client.request<DesignPublishResult, { label: string }>(`${BASE}/designs/${id}/publish`, { method: "POST", headers: ifMatch(draftVersion), body: { label } }),
    versions: (id: string) => client.request<Items<DesignVersionSummary>>(`${BASE}/designs/${id}/versions`),
    version: (id: string, version: number) => client.request<DesignVersion>(`${BASE}/designs/${id}/versions/${version}`),
    /** P15: restoring copies the version into the draft; it does not publish. */
    restore: (id: string, version: number, draftVersion: number) =>
      client.request<DesignRecord>(`${BASE}/designs/${id}/versions/${version}/restore`, { method: "POST", headers: ifMatch(draftVersion) }),
    remove: (id: string) => client.request<void>(`${BASE}/designs/${id}`, { method: "DELETE" })
  } as const;
}

export type DesignApi = ReturnType<typeof designApi>;
