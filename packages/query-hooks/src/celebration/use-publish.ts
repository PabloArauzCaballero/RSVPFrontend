import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ValidationError, type ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { celebrationApi, type Versioned } from "./api.js";
import type { PublicPageState } from "./types.js";

/**
 * Publishing (F12). The checklist comes from the backend (the event type's
 * requiredFieldsForPublish); a 422 on publish carries the exact missing fields too.
 */

export function usePublishCheck(client: ApiClient, id: string) {
  return useQuery({ queryKey: queryKeys.celebration.publishCheck(id), queryFn: () => celebrationApi(client).publishCheck(id), ...cachePolicy.celebration, enabled: Boolean(id) });
}

/** Missing fields from a publish 422 (PUBLISH_REQUIREMENTS_MISSING), or none for any other error. */
export function missingFieldsOf(error: unknown): readonly string[] {
  if (!(error instanceof ValidationError)) return [];
  const fields = error.problem?.["missingFields"];
  return Array.isArray(fields) ? fields.filter((field): field is string => typeof field === "string") : [];
}

/** How often the publish screen asks again while the public page is being built or withdrawn. */
export const PUBLIC_PAGE_POLL_MS = 2_000;
const TRANSITIONS: readonly PublicPageState[] = ["PUBLISHING", "UNPUBLISHING"];

/** True while the public page does not yet agree with the publication decision. */
export const isPublicPageInTransition = (state: PublicPageState | undefined): boolean => state !== undefined && TRANSITIONS.includes(state);

/**
 * GET /celebrations/{id}/public-page (A18). The screen says «publicada» only when this answers
 * LIVE; while the page is being built (PUBLISHING) or withdrawn (UNPUBLISHING) it polls.
 */
export function usePublicPageStatus(client: ApiClient, id: string) {
  return useQuery({
    queryKey: queryKeys.celebration.publicPage(id),
    queryFn: ({ signal }) => celebrationApi(client).publicPage(id, signal),
    staleTime: 0,
    gcTime: cachePolicy.celebration.gcTime,
    enabled: Boolean(id),
    refetchInterval: (query) => (isPublicPageInTransition(query.state.data?.state) ? PUBLIC_PAGE_POLL_MS : false)
  });
}

export type PublicationAction = { readonly kind: "publish" } | { readonly kind: "unpublish"; readonly reason: string | null } | { readonly kind: "archive" };

export function usePublicationAction(client: ApiClient, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ target, action }: { readonly target: Versioned; readonly action: PublicationAction }) => {
      const api = celebrationApi(client);
      if (action.kind === "unpublish") return api.unpublish(target, action.reason);
      return action.kind === "publish" ? api.publish(target) : api.archive(target);
    },
    onSettled: () => Promise.all(invalidation.celebrationChanged(id).map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}
