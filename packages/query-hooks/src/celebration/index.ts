import { useRef } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy, retryTransient } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { celebrationApi, mediaApi, templateApi, type Versioned } from "./api.js";
import { uploadToPresignedUrl } from "../media/upload.js";
import type { EmbedIntent, Celebration, CelebrationPatch, CreateCelebrationInput, EventTypeDefinition, MediaAsset, MediaPurpose, SettingsPatch, TemplateInput } from "./types.js";

export * from "./types.js";
export * from "./api.js";
export * from "./use-publish.js";

function useInvalidate(): (keys: readonly QueryKey[]) => Promise<void> {
  const queryClient = useQueryClient();
  return async (keys) => { await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))); };
}

export function useCelebration<T = Celebration>(client: ApiClient, id: string) {
  return useQuery({ queryKey: queryKeys.celebration.detail(id), queryFn: () => client.request<T>(`/celebrations/${id}`), ...cachePolicy.celebration, enabled: Boolean(id) });
}
export function usePublicCelebration<T>(client: ApiClient, slug: string) {
  return useQuery({ queryKey: queryKeys.celebration.public(slug), queryFn: () => client.request<T>(`/celebrations/public/${slug}`, { auth: false }), ...cachePolicy.celebration, enabled: Boolean(slug) });
}
/**
 * GET /celebrations/public/{slug} in the language the guest reads (Accept-Language), as the public site loads it.
 * A 404 is the answer for an unpublished or unknown slug, so it is not retried.
 */
export function usePublicInvitation<T>(client: ApiClient, slug: string, language: string) {
  return useQuery({
    queryKey: queryKeys.celebration.publicIn(slug, language),
    queryFn: ({ signal }) => client.request<T>(`/celebrations/public/${encodeURIComponent(slug)}`, { auth: false, signal, headers: language ? { "accept-language": language } : {} }),
    ...cachePolicy.celebration, enabled: Boolean(slug), retry: retryTransient
  });
}
/** Photos of a published celebration. Only dresses the page: callers render without it when it fails. */
export function usePublicGallery(client: ApiClient, celebrationId: string | undefined) {
  return useQuery({ queryKey: queryKeys.media.publicGallery(celebrationId ?? ""), queryFn: ({ signal }) => mediaApi(client).publicGallery(celebrationId ?? "", signal), ...cachePolicy.celebration, enabled: Boolean(celebrationId), retry: false });
}

export function useMyCelebrations(client: ApiClient, options: { readonly enabled?: boolean } = {}) {
  return useQuery({ queryKey: queryKeys.celebration.all, queryFn: () => celebrationApi(client).list(), ...cachePolicy.celebration, enabled: options.enabled ?? true });
}
export function useCreateCelebration<TResponse = Celebration, TInput = CreateCelebrationInput>(client: ApiClient) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: TInput) => client.request<TResponse, TInput>("/celebrations", { method: "POST", body: input }), onSuccess: () => invalidate(invalidation.celebrationCreated()) });
}

/** Content editor save. A 409 means someone else saved first; the form keeps what the user typed. */
export function useEditCelebration(client: ApiClient, id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ target, patch }: { readonly target: Versioned; readonly patch: CelebrationPatch }) => celebrationApi(client).edit(target, patch), onSuccess: () => invalidate(invalidation.celebrationChanged(id)) });
}
export function useUpdateSettings(client: ApiClient, id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ target, patch }: { readonly target: Versioned; readonly patch: SettingsPatch }) => celebrationApi(client).updateSettings(target, patch), onSuccess: () => invalidate(invalidation.celebrationChanged(id)) });
}
export function useAssignEventType(client: ApiClient, id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ target, code }: { readonly target: Versioned; readonly code: string }) => celebrationApi(client).assignType(target, code), onSuccess: () => invalidate(invalidation.celebrationChanged(id)) });
}
export function useSelectTemplate(client: ApiClient, id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ target, templateId }: { readonly target: Versioned; readonly templateId: string }) => celebrationApi(client).selectTemplate(target, templateId), onSuccess: () => invalidate(invalidation.celebrationChanged(id)) });
}
/** Grants or changes a collaborator's role (CO_HOST edits, VIEWER only reads). Sends the version as If-Match. */
export function useSetCollaborator(client: ApiClient, id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ target, userId, role }: { readonly target: Versioned; readonly userId: string; readonly role: "CO_HOST" | "VIEWER" }) => celebrationApi(client).setCollaborator(target, userId, role), onSuccess: () => invalidate(invalidation.celebrationChanged(id)) });
}
export function useRemoveCollaborator(client: ApiClient, id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ target, userId }: { readonly target: Versioned; readonly userId: string }) => celebrationApi(client).removeCollaborator(target, userId), onSuccess: () => invalidate(invalidation.celebrationChanged(id)) });
}
export function useAuditLog(client: ApiClient, id: string) {
  return useQuery({ queryKey: queryKeys.celebration.audit(id), queryFn: () => celebrationApi(client).audit(id), ...cachePolicy.celebration, enabled: Boolean(id) });
}

export function useEventTypes(client: ApiClient, locale: string) {
  return useQuery({ queryKey: queryKeys.eventType.list(locale), queryFn: () => celebrationApi(client).eventTypes(locale), ...cachePolicy.provider });
}
export function useAdminEventTypes(client: ApiClient) {
  return useQuery({ queryKey: queryKeys.eventType.admin, queryFn: () => celebrationApi(client).adminEventTypes(), ...cachePolicy.celebration });
}
export function useUpsertEventType(client: ApiClient) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (definition: EventTypeDefinition) => celebrationApi(client).upsertEventType(definition), onSuccess: () => invalidate(invalidation.eventTypesChanged()) });
}

export function useCompatibleTemplates(client: ApiClient, tags: readonly string[]) {
  const key = [...tags].sort().join(",");
  return useQuery({ queryKey: queryKeys.template.compatible(key), queryFn: () => templateApi(client).compatible(tags), ...cachePolicy.provider, enabled: Boolean(tags.length) });
}
export function useTemplate(client: ApiClient, id: string | null) {
  return useQuery({ queryKey: queryKeys.template.detail(id ?? ""), queryFn: () => templateApi(client).get(id ?? ""), ...cachePolicy.provider, enabled: Boolean(id) });
}
export function useAdminTemplates(client: ApiClient) {
  return useQuery({ queryKey: queryKeys.template.admin, queryFn: () => templateApi(client).all(), ...cachePolicy.celebration });
}
export function useSaveTemplate(client: ApiClient) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ target, input }: { readonly target?: Versioned; readonly input: TemplateInput }) => (target ? templateApi(client).edit(target, input) : templateApi(client).create(input)),
    onSuccess: () => invalidate(invalidation.templatesChanged())
  });
}
export function useTemplateTransition(client: ApiClient) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ target, action }: { readonly target: Versioned; readonly action: "publish" | "archive" }) => (action === "publish" ? templateApi(client).publish(target) : templateApi(client).archive(target)),
    onSuccess: () => invalidate(invalidation.templatesChanged())
  });
}

export const MEDIA_PROCESSING_INTERVAL_MS = 2_000;
export const MEDIA_PROCESSING_SLOW_INTERVAL_MS = 5_000;
export const MEDIA_PROCESSING_SLOW_AFTER_MS = 60_000;
export const MEDIA_PROCESSING_STALE_MS = 3 * 60_000;
const MEDIA_URL_STABLE_MS = 5 * 60_000;

function mediaUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

/** Age in ms of an asset in PROCESSING, using the runtime server timestamp when present or when this client first observed it. */
export function processingAgeMs(asset: Pick<MediaAsset, "id"> & { readonly createdAt?: string }, firstSeen: ReadonlyMap<string, number>, now = Date.now()): number {
  const raw = (asset as { readonly createdAt?: unknown }).createdAt;
  const parsed = typeof raw === "string" ? Date.parse(raw) : Number.NaN;
  if (Number.isFinite(parsed)) return Math.max(0, now - parsed);
  const seen = firstSeen.get(asset.id);
  return seen === undefined ? 0 : Math.max(0, now - seen);
}

export function useMediaAssets(client: ApiClient, celebrationId: string) {
  const firstSeen = useRef<Map<string, number>>(new Map());
  const stableUrls = useRef<Map<string, { readonly key: string; readonly url: string; readonly at: number }>>(new Map());
  return useQuery({
    queryKey: queryKeys.media.list(celebrationId),
    queryFn: ({ signal }) => mediaApi(client).list(celebrationId, signal),
    ...cachePolicy.celebration, enabled: Boolean(celebrationId),
    // Presigned GET URLs rotate their signature on every poll; keep the loaded URL stable while the object path is unchanged
    // so existing photos never reload or flicker while another upload is still PROCESSING.
    structuralSharing: (_prev, next) => {
      const list = next as { readonly items?: readonly MediaAsset[] } | undefined;
      if (!list?.items) return next;
      const now = Date.now();
      const cache = stableUrls.current;
      const activeIds = new Set<string>();
      const items = list.items.map((asset) => {
        activeIds.add(asset.id);
        if (asset.status !== "PROCESSED" || !asset.variants) return asset;
        let changed = false;
        const stabilized: Record<string, string> = {};
        for (const [name, url] of Object.entries(asset.variants)) {
          if (!url) continue;
          const cacheKey = `${asset.id}:${name}`;
          const resourceKey = mediaUrlKey(url);
          const entry = cache.get(cacheKey);
          if (entry && entry.key === resourceKey && now - entry.at < MEDIA_URL_STABLE_MS) {
            stabilized[name] = entry.url;
            if (entry.url !== url) changed = true;
          } else {
            cache.set(cacheKey, { key: resourceKey, url, at: now });
            stabilized[name] = url;
          }
        }
        return changed ? { ...asset, variants: stabilized } : asset;
      });
      for (const cacheKey of cache.keys()) {
        const assetId = cacheKey.slice(0, cacheKey.indexOf(":"));
        if (!activeIds.has(assetId)) cache.delete(cacheKey);
      }
      return { ...list, items };
    },
    // /complete returns 202 PROCESSING. Poll quickly at first, back off after 1 min, and stop once all processing assets are stale
    // so a stuck backend job can never trap the client in an infinite refresh loop.
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const processing = (query.state.data?.items ?? []).filter((asset) => asset.status === "PROCESSING");
      if (processing.length === 0) {
        firstSeen.current.clear();
        return false;
      }
      const now = Date.now();
      const active = new Set<string>();
      let newestAge = Number.POSITIVE_INFINITY;
      for (const asset of processing) {
        active.add(asset.id);
        if (!firstSeen.current.has(asset.id)) firstSeen.current.set(asset.id, now);
        newestAge = Math.min(newestAge, processingAgeMs(asset, firstSeen.current, now));
      }
      for (const id of firstSeen.current.keys()) if (!active.has(id)) firstSeen.current.delete(id);
      if (newestAge >= MEDIA_PROCESSING_STALE_MS) return false;
      return newestAge >= MEDIA_PROCESSING_SLOW_AFTER_MS ? MEDIA_PROCESSING_SLOW_INTERVAL_MS : MEDIA_PROCESSING_INTERVAL_MS;
    },
    refetchIntervalInBackground: false
  });
}

export interface UploadInput {
  readonly file: Blob;
  readonly filename: string;
  readonly onProgress: (fraction: number) => void;
  readonly purpose?: MediaPurpose;
  readonly rightsNoticeVersion?: string | null;
  readonly signal?: AbortSignal;
  /** The type and size the picker reported, when the Blob does not carry them (a browser leaves the type of a HEIC empty). */
  readonly contentType?: string;
  readonly size?: number;
}

/** presign (validated by the server first) → PUT to object storage → complete (variants). */
export function useUploadMedia(client: ApiClient, celebrationId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ file, filename, onProgress, purpose, rightsNoticeVersion, contentType, size }: UploadInput): Promise<MediaAsset> => {
      const media = mediaApi(client);
      const intent = await media.presign({ celebrationId, filename, contentType: contentType || file.type, sizeBytes: size ?? file.size, ...(purpose ? { purpose } : {}), ...(rightsNoticeVersion ? { rightsNoticeVersion } : {}) });
      await uploadToPresignedUrl(intent, file, onProgress);
      return media.complete(intent.assetId);
    },
    onSuccess: () => invalidate(invalidation.mediaChanged(celebrationId))
  });
}
/** Quota used and left by the celebration (100 files / 500 MiB by default). The list also carries it as `usage`. */
export function useMediaUsage(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: [...queryKeys.media.list(celebrationId), "usage"] as const, queryFn: ({ signal }) => mediaApi(client).usage(celebrationId, signal), ...cachePolicy.celebration, enabled: Boolean(celebrationId) });
}
/** Turns a pasted link into the embed the invitation may load. A 422 means the link is off the allowlist. */
export function useResolveEmbed(client: ApiClient) {
  return useMutation({ mutationFn: ({ url, intent }: { readonly url: string; readonly intent?: EmbedIntent }) => mediaApi(client).resolveEmbed(url, intent) });
}
export function useReorderMedia(client: ApiClient, celebrationId: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ assetIds, coverAssetId }: { readonly assetIds: readonly string[]; readonly coverAssetId: string | null }) => mediaApi(client).reorder(celebrationId, assetIds, coverAssetId), onSuccess: () => invalidate(invalidation.mediaChanged(celebrationId)) });
}
export function useDeleteMedia(client: ApiClient, celebrationId: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (assetId: string) => mediaApi(client).remove(assetId), onSuccess: () => invalidate(invalidation.mediaChanged(celebrationId)) });
}
