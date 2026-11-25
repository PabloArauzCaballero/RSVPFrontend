import type { design } from "@rsvp/celebration-theme";

export interface VersionSummary { readonly version: number; readonly label: string; readonly createdAt: string }
/** What publishing and history need from the API (BE #135): publish, list, restore. Restoring copies into the draft; it does not publish (P15). */
export interface VersionsGateway {
  list(designId: string): Promise<readonly VersionSummary[]>;
  publish(designId: string, draftVersion: number, label: string): Promise<{ readonly draftVersion: number; readonly version: VersionSummary }>;
  restore(designId: string, version: number, draftVersion: number): Promise<{ readonly draftVersion: number; readonly document: design.DesignDocumentV2 }>;
}

export type PublishOutcome =
  | { readonly kind: "published"; readonly version: number }
  | { readonly kind: "unchanged"; readonly version: number }
  | { readonly kind: "blocked" }
  | { readonly kind: "rejected"; readonly code: string }
  | { readonly kind: "failed" };
