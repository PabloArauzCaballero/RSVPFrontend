import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { celebrationApi, mediaApi, templateApi, type Versioned } from "./api.js";
import { uploadToPresignedUrl } from "../media/upload.js";
import type { Celebration, CelebrationPatch, CreateCelebrationInput, EventTypeDefinition, MediaAsset, SettingsPatch, TemplateInput } from "./types.js";

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
export function useMyCelebrations(client: ApiClient) {
  return useQuery({ queryKey: queryKeys.celebration.all, queryFn: () => celebrationApi(client).list(), ...cachePolicy.celebration });
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

export function useMediaAssets(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.media.list(celebrationId), queryFn: () => mediaApi(client).list(celebrationId), ...cachePolicy.celebration, enabled: Boolean(celebrationId) });
}

export interface UploadInput { readonly file: Blob; readonly filename: string; readonly onProgress: (fraction: number) => void }

/** presign (validated by the server first) → PUT to object storage → complete (variants). */
export function useUploadMedia(client: ApiClient, celebrationId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ file, filename, onProgress }: UploadInput): Promise<MediaAsset> => {
      const media = mediaApi(client);
      const intent = await media.presign({ celebrationId, filename, contentType: file.type, sizeBytes: file.size });
      await uploadToPresignedUrl(intent, file, onProgress);
      return media.complete(intent.assetId);
    },
    onSuccess: () => invalidate(invalidation.mediaChanged(celebrationId))
  });
}
export function useReorderMedia(client: ApiClient, celebrationId: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ assetIds, coverAssetId }: { readonly assetIds: readonly string[]; readonly coverAssetId: string | null }) => mediaApi(client).reorder(celebrationId, assetIds, coverAssetId), onSuccess: () => invalidate(invalidation.mediaChanged(celebrationId)) });
}
export function useDeleteMedia(client: ApiClient, celebrationId: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (assetId: string) => mediaApi(client).remove(assetId), onSuccess: () => invalidate(invalidation.mediaChanged(celebrationId)) });
}
