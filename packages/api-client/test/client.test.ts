import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/client.js";
import { ApiError } from "../src/errors.js";

describe("createApiClient", () => {
  it.each([new TypeError("offline"), new ApiError(503, "c", { title: "Unavailable", status: 503 }), new ApiError(429, "c", { title: "Slow down", status: 429 })])("keeps the session on a recoverable refresh failure and retries on the next request: %s", async (error) => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 })).mockResolvedValueOnce(new Response("{}", { status: 401 })).mockResolvedValueOnce(new Response('{"ok":true}'));
    const store = { getAccessToken: async () => "old", getRefreshToken: async () => "refresh", setTokens: vi.fn(), clear: vi.fn() };
    const refresh = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ accessToken: "new", expiresIn: 900 });
    const onUnauthorized = vi.fn();
    const client = createApiClient({ baseUrl: "https://api.test", tokenStore: store, refreshSession: { refresh }, fetchFn, onUnauthorized });
    await expect(client.request("/celebrations")).rejects.toBe(error);
    expect(store.clear).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
    await expect(client.request("/celebrations")).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("clears a session only when Identity rejects its refresh credential", async () => {
    const clear = vi.fn();
    const onUnauthorized = vi.fn();
    const client = createApiClient({ baseUrl: "https://api.test", tokenStore: { getAccessToken: async () => "old", getRefreshToken: async () => "dead", setTokens: vi.fn(), clear }, refreshSession: { refresh: async () => { throw new ApiError(401, "c"); } }, fetchFn: vi.fn().mockResolvedValue(new Response("{}", { status: 401 })), onUnauthorized });
    await expect(client.request("/celebrations")).rejects.toMatchObject({ status: 401 });
    expect(clear).toHaveBeenCalledOnce();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
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

describe("bodiless success responses", () => {
  it("a 202 with an empty body resolves to undefined instead of failing to parse JSON (Identity password recovery)", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 202, headers: { "content-length": "0" } })) as unknown as typeof fetch;
    const client = createApiClient({ baseUrl: "http://x", tokenStore: { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }, refreshSession: { refresh: async () => { throw new Error("unused"); } }, fetchFn });
    await expect(client.request("/identity/auth/password-recovery", { method: "POST", body: { email: "a@b.co" }, auth: false })).resolves.toBeUndefined();
  });

  it("returns the body as text and asks for text/csv with responseType text, without parsing it as JSON", async () => {
    const csv = "proveedor,producto\r\nDulce Sol,Torta\r\n";
    const fetchFn = vi.fn().mockResolvedValue(new Response(csv, { status: 200, headers: { "content-type": "text/csv" } }));
    const client = createApiClient({ baseUrl: "https://api.test", tokenStore: { getAccessToken: async () => "t", getRefreshToken: async () => null, setTokens: vi.fn(), clear: vi.fn() }, refreshSession: { refresh: vi.fn() }, fetchFn });
    await expect(client.request<string>("/providers/admin/leads/report.csv?month=2026-11", { responseType: "text" })).resolves.toBe(csv);
    expect(new Headers(fetchFn.mock.calls[0][1].headers).get("accept")).toContain("text/csv");
  });
  it("keeps JSON as the default answer and Accept", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{"a":1}', { status: 200 }));
    const client = createApiClient({ baseUrl: "https://api.test", tokenStore: { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: vi.fn(), clear: vi.fn() }, refreshSession: { refresh: vi.fn() }, fetchFn });
    await expect(client.request("/x", { auth: false })).resolves.toEqual({ a: 1 });
    expect(new Headers(fetchFn.mock.calls[0][1].headers).get("accept")).toBe("application/json");
  });
});
