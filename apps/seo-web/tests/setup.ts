import { vi } from "vitest";

/** Server components read the request language from a header set by middleware; tests render outside a request, so they get it from here. */
export const requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders, cookies: async () => ({ get: () => undefined }) }));
