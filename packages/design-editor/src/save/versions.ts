import type { design } from "@rsvp/celebration-theme";

export interface VersionSummary { readonly version: number; readonly label: string; readonly createdAt: string }
/** One page of the history, newest first: `nextBefore` is the `before` of the next page, or null on the last one (the server keeps 100). */
export interface VersionPage { readonly items: readonly VersionSummary[]; readonly nextBefore: number | null }
/** What publishing and history need from the API (BE #135): publish, list, restore. Restoring copies into the draft; it does not publish (P15). */
export interface VersionsGateway {
  list(designId: string, before?: number): Promise<VersionPage>;
  publish(designId: string, draftVersion: number, label: string): Promise<{ readonly draftVersion: number; readonly version: VersionSummary }>;
  restore(designId: string, version: number, draftVersion: number): Promise<{ readonly draftVersion: number; readonly document: design.DesignDocumentV2; readonly warnings?: readonly design.DesignWarning[] }>;
}

export type PublishOutcome =
  | { readonly kind: "published"; readonly version: number }
  | { readonly kind: "unchanged"; readonly version: number }
  | { readonly kind: "blocked" }
  /** 409: a newer draft exists. */
  | { readonly kind: "conflict" }
  | { readonly kind: "signIn" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "rejected"; readonly code: string }
  | { readonly kind: "failed" };
