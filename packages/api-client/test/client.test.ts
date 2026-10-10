import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/client.js";

describe("createApiClient", () => {
  it("refreshes once after a 401 and retries with the new access token", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ title: "Expired", status: 401 }), { status: 401, headers: { "content-type": "application/problem+json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "celebration" }), { status: 200 }));
    const store = { getAccessToken: vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new"), getRefreshToken: vi.fn().mockResolvedValue("refresh"), setTokens: vi.fn(), clear: vi.fn() };
    const refreshSession = { refresh: vi.fn().mockResolvedValue({ accessToken: "new", refreshToken: "rotated", expiresIn: 900 }) };
    const client = createApiClient({ baseUrl: "https://api.test", tokenStore: store, refreshSession, fetchFn, createCorrelationId: () => "cid" });
    await expect(client.request<{ id: string }>("/celebrations/id")).resolves.toEqual({ id: "celebration" });
    expect(refreshSession.refresh).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchFn.mock.calls[1][1].headers).get("authorization")).toBe("Bearer new");
  });

  it("propagates a correlation id", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createApiClient({ baseUrl: "https://api.test", tokenStore: { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => {}, clear: async () => {} }, refreshSession: { refresh: vi.fn() }, fetchFn, createCorrelationId: () => "correlation-42" });
    await client.request("/health", { auth: false });
    expect(new Headers(fetchFn.mock.calls[0][1].headers).get("x-correlation-id")).toBe("correlation-42");
  });
});
