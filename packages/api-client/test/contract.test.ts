import type { CelebrationPaths } from "@rsvp/contracts";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/client.js";
import { createContractClient, expandPath } from "../src/contract.js";

const makeClient = (fetchFn: typeof fetch) => createContractClient<CelebrationPaths>(createApiClient({
  baseUrl: "https://api.test", fetchFn, createCorrelationId: () => "cid-1", refreshSession: { refresh: vi.fn() },
  tokenStore: { getAccessToken: async () => "tok", getRefreshToken: async () => null, setTokens: async () => {}, clear: async () => {} }
}));

describe("createContractClient", () => {
  it("expands path params, sends the body and returns the typed success body", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ready: true, missingFields: [], status: "DRAFT", version: 3 }), { status: 200 }));
    const result = await makeClient(fetchFn as unknown as typeof fetch).get("/celebrations/{celebrationId}/publish-check", { path: { celebrationId: "a b" } });
    expect(result).toMatchObject({ ready: true });
    expect(fetchFn.mock.calls[0][0]).toBe("https://api.test/celebrations/a%20b/publish-check");
    expect(new Headers(fetchFn.mock.calls[0][1].headers).get("x-correlation-id")).toBe("cid-1");
    expect(new Headers(fetchFn.mock.calls[0][1].headers).get("authorization")).toBe("Bearer tok");
  });

  it("throws before any request when a path parameter is missing (negative)", async () => {
    const fetchFn = vi.fn();
    const client = makeClient(fetchFn as unknown as typeof fetch);
    // @ts-expect-error the contract requires `path.celebrationId`: omitting it is a compile error as well
    await expect(client.get("/celebrations/{celebrationId}/publish-check", { path: {} })).rejects.toThrow(/Missing path parameter/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("serialises query params and skips undefined values", () => {
    expect(expandPath("/x/{id}", { id: 1 }, { limit: 10, q: undefined, tag: ["a", "b"] })).toBe("/x/1?limit=10&tag=a&tag=b");
  });

  it("rejects routes, methods and bodies the contract does not declare at compile time", () => {
    const client = makeClient(vi.fn() as unknown as typeof fetch);
    const never = async () => {
      // @ts-expect-error unknown route
      await client.get("/celebrations/does-not-exist");
      // @ts-expect-error GET is not declared for the publish route
      await client.get("/celebrations/{celebrationId}/publish", { path: { celebrationId: "x" } });
      // @ts-expect-error the body must match the CreateCelebration schema (slug and eventTypeCode are required)
      await client.post("/celebrations", { body: { wrong: true } });
    };
    expect(typeof never).toBe("function");
  });
});
