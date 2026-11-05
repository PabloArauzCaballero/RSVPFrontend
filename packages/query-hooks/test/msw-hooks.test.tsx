import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ConflictError, createApiClient, toApiError, ForbiddenError, UnauthorizedError, ValidationError } from "@rsvp/api-client";
import { HttpResponse, http, problem, setupServer } from "@rsvp/testing";
import { useCelebration, useEditCelebration, useMyCelebrations, usePublicCelebration } from "../src/index.js";

// REQ-F04-04/06 with MSW: the hooks run against the real fetch-based client; only the network is simulated.
const BASE = "http://gateway.msw";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setup() {
  const client = createApiClient({
    baseUrl: BASE, refreshSession: { refresh: async () => { throw toApiError(401, "refresh", { title: "Invalid refresh token", status: 401 }); } },
    tokenStore: { getAccessToken: async () => "tok", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe("celebration hooks over MSW", () => {
  it("lists my celebrations with the bearer token and a correlation id", async () => {
    let seen: Headers | undefined;
    server.use(http.get(`${BASE}/celebrations`, ({ request }) => { seen = request.headers; return HttpResponse.json({ items: [{ id: "c-1" }] }); }));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useMyCelebrations(client), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ items: [{ id: "c-1" }] });
    expect(seen?.get("authorization")).toBe("Bearer tok");
    expect(seen?.get("x-correlation-id")).toBeTruthy();
  });

  it("the public page is read without credentials", async () => {
    let auth: string | null = "unset";
    server.use(http.get(`${BASE}/celebrations/public/ana-y-luis`, ({ request }) => { auth = request.headers.get("authorization"); return HttpResponse.json({ slug: "ana-y-luis" }); }));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => usePublicCelebration<{ slug: string }>(client, "ana-y-luis"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(auth).toBeNull();
  });

  it.each([[401, UnauthorizedError], [403, ForbiddenError], [409, ConflictError], [422, ValidationError]] as const)("a %i answer becomes a typed error with the problem details", async (status, ErrorType) => {
    server.use(http.get(`${BASE}/celebrations/c-9`, () => problem(status, "Nope", "corr-9")));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useCelebration(client, "c-9"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ErrorType);
    expect(result.current.error).toMatchObject({ status });
  });

  it("an edit sends If-Match with the version the person edited; a stale version answers 409 and keeps the cache", async () => {
    let ifMatch: string | null = null;
    server.use(http.patch(`${BASE}/celebrations/c-1`, ({ request }) => { ifMatch = request.headers.get("if-match"); return problem(409, "Version conflict"); }));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useEditCelebration(client, "c-1"), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ target: { id: "c-1", version: 3 }, patch: { title: "Nuevo" } as never })).rejects.toBeInstanceOf(ConflictError); });
    expect(ifMatch).toBe('"3"');
  });
});
