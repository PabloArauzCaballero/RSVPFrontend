"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { PhotoInputError, photoInputProblem, type PhotoType, type PollOptions } from "./product-sheet.js";
import type { PhotoStage } from "./product-sheet-hooks.js";
import { providerMediaKeys, providerMediaService, waitForMedia, type ProviderMedia, type ProviderMediaPurpose } from "./provider-media.js";

/** GET /providers/{id}/media: the gallery photos and logos of the provider, with their processing state. */
export function useProviderMedia(client: ApiClient, providerId: string | undefined) {
  return useQuery({
    queryKey: providerMediaKeys.list(providerId ?? ""),
    queryFn: ({ signal }) => providerMediaService(client).list(providerId ?? "", signal),
    enabled: Boolean(providerId), staleTime: 15_000, gcTime: 5 * 60_000
  });
}

export interface UploadProviderMediaVariables {
  readonly file: Blob;
  readonly contentType: string;
  readonly purpose: ProviderMediaPurpose;
  readonly idempotencyKey: string;
  readonly altText?: string;
  readonly onStage?: (stage: PhotoStage) => void;
}

/**
 * Register, PUT the bytes, complete and wait until READY or REJECTED. A refused file (type, size) never reaches the server.
 * Returns the settled photo; leaving the screen stops the wait (the worker still finishes it).
 */
export function useUploadProviderMedia(client: ApiClient, providerId: string, options: { readonly put?: typeof fetch; readonly poll?: PollOptions } = {}) {
  const queryClient = useQueryClient();
  const controllers = useRef(new Set<AbortController>());
  useEffect(() => () => { controllers.current.forEach((controller) => controller.abort()); }, []);
  return useMutation({
    mutationFn: async ({ file, contentType, purpose, idempotencyKey, altText, onStage }: UploadProviderMediaVariables): Promise<ProviderMedia | undefined> => {
      const problem = photoInputProblem({ type: contentType, size: file.size });
      if (problem) throw new PhotoInputError(problem);
      const service = providerMediaService(client, options.put);
      onStage?.("requesting");
      const registered = await service.requestUpload(providerId, { purpose, contentType: contentType as PhotoType, bytes: file.size, ...(altText?.trim() ? { altText: altText.trim() } : {}) }, idempotencyKey);
      if (registered.upload) {
        onStage?.("uploading");
        await service.put(registered.upload, file);
      }
      onStage?.("processing");
      if (registered.status === "PENDING_UPLOAD" || registered.upload) await service.complete(providerId, registered.id);
      const controller = new AbortController();
      controllers.current.add(controller);
      try {
        return await waitForMedia(service, providerId, registered.id, { ...options.poll, signal: controller.signal });
      } finally {
        controllers.current.delete(controller);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: providerMediaKeys.list(providerId) })
  });
}

/** DELETE a photo (204). 409 MEDIA_IN_USE while the saved microsite still shows it. */
export function useDeleteProviderMedia(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => providerMediaService(client).remove(providerId, photoId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: providerMediaKeys.list(providerId) })
  });
}
