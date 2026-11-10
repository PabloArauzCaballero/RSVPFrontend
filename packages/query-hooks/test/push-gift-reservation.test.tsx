import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { toApiError, type ApiClient } from "@rsvp/api-client";
import { queryKeys, usePushGiftReservation, type ReservationList } from "../src/index.js";

const pending = { id: "r-1", celebrationId: "c-1", itemId: "g-1", status: "PENDING_REVIEW" as const, requestedAt: "2026-11-07T02:00:00Z" };
afterEach(cleanup);

function setup(items: ReservationList["items"], status?: number) {
  const request = vi.fn(async () => {
    if (status) throw toApiError(status, "f20", { status, title: "Request failed" });
    return { items };
  });
  const client: ApiClient = { request: async <T,>() => await request() as T };
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queries}>{children}</QueryClientProvider>;
  return { client, queries, wrapper, request };
}

it("F20 · opening the request checks the server even when the shared reservation cache is fresh", async () => {
  const { client, queries, wrapper, request } = setup([{ ...pending, status: "COMMITTED" }]);
  const key = [...queryKeys.gift.list("c-1"), "reservations", "all"] as const;
  queries.setQueryData(key, { items: [pending] });
  const view = renderHook(() => usePushGiftReservation(client, "c-1", "r-1"), { wrapper });
  await waitFor(() => expect(view.result.current.data?.status).toBe("COMMITTED"));
  expect(request).toHaveBeenCalledOnce();
  expect(queries.getQueryData<ReservationList>(key)?.items[0]?.status).toBe("COMMITTED");
  view.unmount(); queries.clear();
});

it("F20 · a matching reservation ID from another celebration is not a visible detail", async () => {
  const { client, queries, wrapper } = setup([{ ...pending, celebrationId: "c-other" }]);
  const view = renderHook(() => usePushGiftReservation(client, "c-1", "r-1"), { wrapper });
  await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
  expect(view.result.current.data).toBeNull();
  view.unmount(); queries.clear();
});

it("F20 · an empty target performs no request", () => {
  const { client, queries, wrapper, request } = setup([]);
  const view = renderHook(() => usePushGiftReservation(client, "", ""), { wrapper });
  expect(view.result.current.fetchStatus).toBe("idle");
  expect(request).not.toHaveBeenCalled();
  view.unmount(); queries.clear();
});

it("F20 · an authorization failure is surfaced without repeated polling retries", async () => {
  const { client, queries, wrapper, request } = setup([], 403);
  const view = renderHook(() => usePushGiftReservation(client, "c-1", "r-1"), { wrapper });
  await waitFor(() => expect(view.result.current.isError).toBe(true));
  expect(request).toHaveBeenCalledOnce();
  view.unmount(); queries.clear();
});
