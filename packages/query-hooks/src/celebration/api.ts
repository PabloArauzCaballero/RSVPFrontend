import type { ApiClient } from "@rsvp/api-client";
import type {
  AuditEntry, Celebration, CelebrationPatch, CreateCelebrationInput, EventTypeDefinition, Items, MediaAsset, PublishCheck,
  SettingsPatch, Template, TemplateInput, TranslatedEventType, UploadIntent
} from "./types.js";

/**
 * Every Celebration and Template/Media call the host and admin screens make. Writes send the
 * version the user edited as If-Match, so a concurrent edit answers 409 instead of
 * overwriting someone else's work.
 */

const ifMatch = (version: number): HeadersInit => ({ "if-match": `"${version}"` });
const languageHeader = (locale?: string): HeadersInit => (locale ? { "accept-language": locale } : {});
const BASE = "/celebrations";
const MEDIA = "/media";

export interface Versioned { readonly id: string; readonly version: number }

export function celebrationApi(client: ApiClient) {
  const mutate = <TBody>(path: string, method: "PATCH" | "PUT" | "POST" | "DELETE", target: Versioned, body?: TBody) =>
    client.request<Celebration, TBody>(path, { method, headers: ifMatch(target.version), ...(body === undefined ? {} : { body }) });
  return {
    list: () => client.request<Items<Celebration>>(`${BASE}?limit=100`),
    get: (id: string) => client.request<Celebration>(`${BASE}/${id}`),
    create: (input: CreateCelebrationInput) => client.request<Celebration, CreateCelebrationInput>(BASE, { method: "POST", body: input }),
    edit: (target: Versioned, patch: CelebrationPatch) => mutate(`${BASE}/${target.id}`, "PATCH", target, patch),
    updateSettings: (target: Versioned, patch: SettingsPatch) => mutate(`${BASE}/${target.id}/settings`, "PUT", target, patch),
    assignType: (target: Versioned, eventTypeCode: string) => mutate(`${BASE}/${target.id}/event-type`, "PUT", target, { eventTypeCode }),
    selectTemplate: (target: Versioned, templateId: string) => mutate(`${BASE}/${target.id}/template`, "PUT", target, { templateId }),
    setCollaborator: (target: Versioned, userId: string, role: "CO_HOST" | "VIEWER") => mutate(`${BASE}/${target.id}/collaborators/${userId}`, "PUT", target, { role }),
    removeCollaborator: (target: Versioned, userId: string) => mutate(`${BASE}/${target.id}/collaborators/${userId}`, "DELETE", target),
    publishCheck: (id: string) => client.request<PublishCheck>(`${BASE}/${id}/publish-check`),
    publish: (target: Versioned) => mutate(`${BASE}/${target.id}/publish`, "POST", target),
    unpublish: (target: Versioned, reason: string | null) => mutate(`${BASE}/${target.id}/unpublish`, "POST", target, { reason }),
    archive: (target: Versioned) => mutate(`${BASE}/${target.id}/archive`, "POST", target),
    audit: (id: string) => client.request<Items<AuditEntry>>(`${BASE}/${id}/audit`),
    eventTypes: (locale?: string) => client.request<Items<TranslatedEventType>>(`${BASE}/event-types`, { auth: false, headers: languageHeader(locale) }),
    eventType: (code: string, locale?: string) => client.request<TranslatedEventType>(`${BASE}/event-types/${code}`, { auth: false, headers: languageHeader(locale) }),
    adminEventTypes: () => client.request<Items<EventTypeDefinition>>(`${BASE}/admin/event-types`),
    upsertEventType: ({ code, ...definition }: EventTypeDefinition) => client.request<EventTypeDefinition, Omit<EventTypeDefinition, "code">>(`${BASE}/admin/event-types/${code}`, { method: "PUT", body: definition }),
    replayPublicProjection: () => client.request<{ readonly applied: number }>(`${BASE}/admin/projections/public/replay`, { method: "POST" })
  } as const;
}

export function templateApi(client: ApiClient) {
  const transition = (template: Versioned, action: "publish" | "archive") =>
    client.request<Template>(`${MEDIA}/templates/${template.id}/${action}`, { method: "POST", headers: ifMatch(template.version) });
  return {
    compatible: (tags: readonly string[]) => client.request<Items<Template>>(`${MEDIA}/templates?eventTypeTags=${encodeURIComponent(tags.join(","))}`, { auth: false }),
    get: (id: string) => client.request<Template>(`${MEDIA}/templates/${id}`, { auth: false }),
    all: () => client.request<Items<Template>>(`${MEDIA}/admin/templates`),
    create: (input: TemplateInput) => client.request<Template, TemplateInput>(`${MEDIA}/templates`, { method: "POST", body: input }),
    edit: (template: Versioned, patch: Partial<TemplateInput>) => client.request<Template, Partial<TemplateInput>>(`${MEDIA}/templates/${template.id}`, { method: "PATCH", body: patch, headers: ifMatch(template.version) }),
    publish: (template: Versioned) => transition(template, "publish"),
    archive: (template: Versioned) => transition(template, "archive")
  } as const;
}

export function mediaApi(client: ApiClient) {
  return {
    presign: (input: { readonly celebrationId: string; readonly filename: string; readonly contentType: string; readonly sizeBytes: number }) =>
      client.request<UploadIntent, typeof input>(`${MEDIA}/uploads/presign`, { method: "POST", body: input }),
    complete: (assetId: string) => client.request<MediaAsset>(`${MEDIA}/uploads/${assetId}/complete`, { method: "POST" }),
    list: (celebrationId: string) => client.request<Items<MediaAsset>>(`${MEDIA}/celebrations/${celebrationId}/assets`),
    reorder: (celebrationId: string, assetIds: readonly string[], coverAssetId: string | null) =>
      client.request<Items<MediaAsset>, { readonly assetIds: readonly string[]; readonly coverAssetId: string | null }>(`${MEDIA}/celebrations/${celebrationId}/assets/order`, { method: "PUT", body: { assetIds, coverAssetId } }),
    remove: (assetId: string) => client.request<void>(`${MEDIA}/assets/${assetId}`, { method: "DELETE" })
  } as const;
}
