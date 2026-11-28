"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import {
  PhotoInputError, photoInputProblem, productSheetKeys, productSheetService, waitForPhoto,
  type CreateProductInput, type ListingPhoto, type PatchListingInput, type PhotoType, type PollOptions, type ProductSheet, type WhatsappTemplate
} from "./product-sheet.js";

/**
 * React hooks of the product sheet. They live apart from `product-sheet.ts` so that only they are a client module: its constants and
 * pure helpers stay usable from a server component (seo-web imports the package barrel).
 */
const remember = (queryClient: QueryClient, providerId: string, locale: string, sheet: ProductSheet): void => {
  queryClient.setQueryData(productSheetKeys.sheet(providerId, sheet.id, locale), sheet);
};
const refreshList = (queryClient: QueryClient, providerId: string): Promise<void> => queryClient.invalidateQueries({ queryKey: productSheetKeys.listings(providerId) });

/** GET /providers/{id}/listings/{lid}: the whole sheet, with `version` for the next If-Match. */
export function useListingSheet(client: ApiClient, providerId: string | undefined, listingId: string | undefined, locale: string) {
  return useQuery({
    queryKey: productSheetKeys.sheet(providerId ?? "", listingId ?? "", locale),
    queryFn: ({ signal }) => productSheetService(client).get(providerId ?? "", listingId ?? "", locale, signal),
    enabled: Boolean(providerId && listingId), staleTime: 15_000, gcTime: 5 * 60_000
  });
}

/** POST a PRODUCT draft. The caller keeps one Idempotency-Key per draft, so a double tap or a retry after a lost answer replays it. */
export function useCreateProduct(client: ApiClient, providerId: string, locale: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateProductInput; idempotencyKey: string }) => productSheetService(client).create(providerId, input, locale, idempotencyKey),
    onSuccess: (sheet) => { remember(queryClient, providerId, locale, sheet); return refreshList(queryClient, providerId); }
  });
}

/** PATCH with If-Match = the loaded version. A 409 VERSION_CONFLICT reaches the screen, which offers to reload; the edit is never retried blind. */
export function usePatchListing(client: ApiClient, providerId: string, listingId: string, locale: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ version, input }: { version: number; input: PatchListingInput }) => productSheetService(client).patch(providerId, listingId, version, input, locale),
    onSuccess: (sheet) => { remember(queryClient, providerId, locale, sheet); return refreshList(queryClient, providerId); }
  });
}

/** POST …/duplicate (decision 4: the copy has no photos and starts as an INCOMPLETE draft). */
export function useDuplicateListing(client: ApiClient, providerId: string, locale: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, idempotencyKey }: { listingId: string; idempotencyKey: string }) => productSheetService(client).duplicate(providerId, listingId, locale, idempotencyKey),
    onSuccess: (sheet) => { remember(queryClient, providerId, locale, sheet); return refreshList(queryClient, providerId); }
  });
}

export type PhotoStage = "requesting" | "uploading" | "processing";
export interface UploadPhotoVariables {
  readonly file: Blob;
  readonly contentType: string;
  readonly idempotencyKey: string;
  readonly altText?: string;
  readonly variantId?: string;
  readonly onStage?: (stage: PhotoStage) => void;
}

/**
 * The three steps of §5.2 plus the wait: (1) register the photo, (2) PUT the bytes, (3) complete, then read the sheet until the
 * photo is READY or REJECTED. The declared `bytes` is the size of the very Blob that is sent (the URL signs Content-Length).
 * Returns the settled photo; the cached sheet is replaced by the last one read, so completeness and `missing` update too.
 */
export function useUploadListingPhoto(client: ApiClient, providerId: string, listingId: string, locale: string, options: { readonly put?: typeof fetch; readonly poll?: PollOptions } = {}) {
  const queryClient = useQueryClient();
  // The wait polls the sheet for up to 60 s: leaving the screen stops it instead of reading in the background.
  // Each upload has its own controller, so unmounting stops every one still running, not only the last.
  const controllers = useRef(new Set<AbortController>());
  useEffect(() => () => { controllers.current.forEach((controller) => controller.abort()); }, []);
  return useMutation({
    mutationFn: async ({ file, contentType, idempotencyKey, altText, variantId, onStage }: UploadPhotoVariables): Promise<ListingPhoto | undefined> => {
      const problem = photoInputProblem({ type: contentType, size: file.size });
      if (problem) throw new PhotoInputError(problem);
      const service = productSheetService(client, options.put);
      onStage?.("requesting");
      const registered = await service.requestPhotoUpload(providerId, listingId, {
        contentType: contentType as PhotoType, bytes: file.size,
        ...(altText?.trim() ? { altText: altText.trim() } : {}), ...(variantId ? { variantId } : {})
      }, idempotencyKey);
      if (registered.upload) {
        onStage?.("uploading");
        await service.putPhoto(registered.upload, file);
      }
      onStage?.("processing");
      if (registered.status === "PENDING_UPLOAD" || registered.upload) await service.completePhoto(providerId, listingId, registered.id);
      const controller = new AbortController();
      controllers.current.add(controller);
      try {
        const { sheet, photo } = await waitForPhoto(service, { providerId, listingId, photoId: registered.id, locale }, { ...options.poll, signal: controller.signal });
        remember(queryClient, providerId, locale, sheet);
        return photo;
      } finally {
        controllers.current.delete(controller);
      }
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: productSheetKeys.sheet(providerId, listingId, locale) }),
      refreshList(queryClient, providerId)
    ])
  });
}

/** DELETE a photo (204; the worker removes the objects). The sheet is read again: the product may turn INCOMPLETE (PHOTO). */
export function useDeleteListingPhoto(client: ApiClient, providerId: string, listingId: string, locale: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => productSheetService(client).deletePhoto(providerId, listingId, photoId),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: productSheetKeys.sheet(providerId, listingId, locale) }),
      refreshList(queryClient, providerId)
    ])
  });
}

/** GET /providers/gift-ideas?category= (public, max-age 300): the ideas a product of that category can cover (§5.4). */
export function useGiftIdeas(client: ApiClient, category: string | undefined, locale: string) {
  return useQuery({
    queryKey: productSheetKeys.giftIdeas(category ?? "", locale),
    queryFn: () => productSheetService(client).giftIdeas(category ?? "", locale),
    enabled: Boolean(category), staleTime: 300_000
  });
}

/** The ideas of a category read now (cache first, same key as `useGiftIdeas`): a save that depends on them must not guess when the list is still loading. Rejects when the read fails. */
export function fetchGiftIdeas(queryClient: QueryClient, client: ApiClient, category: string, locale: string) {
  return queryClient.fetchQuery({ queryKey: productSheetKeys.giftIdeas(category, locale), queryFn: () => productSheetService(client).giftIdeas(category, locale), staleTime: 300_000 });
}

/** GET /providers/{id}/whatsapp-template: the provider's own template, the default one and the allowed variables. */
export function useWhatsappTemplate(client: ApiClient, providerId: string | undefined) {
  return useQuery({ queryKey: productSheetKeys.whatsappTemplate(providerId ?? ""), queryFn: () => productSheetService(client).whatsappTemplate(providerId ?? ""), enabled: Boolean(providerId), staleTime: 60_000 });
}

export function useSaveWhatsappTemplate(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (template: WhatsappTemplate) => productSheetService(client).saveWhatsappTemplate(providerId, template),
    onSuccess: (view) => { queryClient.setQueryData(productSheetKeys.whatsappTemplate(providerId), view); }
  });
}
