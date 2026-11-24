import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import { queryKeys } from "../keys.js";
import { designApi, type CreateDesignInput, type DesignRecord } from "./api.js";

const NOT_FOUND = 404;

/**
 * The design of a celebration, or `null` when it has none yet (404): the editor then offers to create it from the template.
 * Never cached for long: the draft is edited elsewhere (another tab, a co-host), and the editor holds its own copy while open.
 */
export function useCelebrationDesign(client: ApiClient, celebrationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.design.celebration(celebrationId ?? ""),
    enabled: Boolean(celebrationId),
    staleTime: 0, gcTime: 0, retry: false,
    queryFn: async (): Promise<DesignRecord | null> => {
      try { return await designApi(client).forCelebration(celebrationId ?? ""); }
      catch (error) { if (error instanceof ApiError && error.status === NOT_FOUND) return null; throw error; }
    }
  });
}

export function useCreateDesign(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDesignInput) => designApi(client).create(input),
    onSuccess: (created) => { if (created.celebrationId) queryClient.setQueryData(queryKeys.design.celebration(created.celebrationId), created); }
  });
}
