import { describe, expect, it } from "vitest";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import { loadPublicPage } from "../lib/celebration";

const view = { celebrationId: "c1", slug: "ana-luis", templateId: "t1" };
const client = (routes: Record<string, () => unknown>): ApiClient => ({ request: async (path: string) => { const route = Object.entries(routes).find(([prefix]) => path.startsWith(prefix)); if (!route) throw new ApiError(404, "x"); return route[1](); } }) as unknown as ApiClient;
const down = () => { throw new ApiError(502, "x"); };

describe("loadPublicPage", () => {
  it("renders the celebration without template or photos when the media service is down (502)", async () => {
    const page = await loadPublicPage("ana-luis", "es", client({ "/celebrations/public/": () => view, "/media/": down }));
    expect(page).toMatchObject({ view, template: null, gallery: [] });
  });
  it("keeps the real template and gallery when media answers", async () => {
    const page = await loadPublicPage("ana-luis", "es", client({ "/celebrations/public/": () => view, "/media/templates/": () => ({ id: "t1" }), "/media/public/": () => ({ items: [{ id: "g1" }] }) }));
    expect(page?.template).toEqual({ id: "t1" }); expect(page?.gallery).toHaveLength(1);
  });
  it("draws the design the host published instead of the template's own look, and ignores anything that is not a design document v2", async () => {
    const document = { schemaVersion: 2, tokens: {}, pages: [] };
    const routes = (design: () => unknown) => ({ "/celebrations/public/": () => view, "/media/templates/": () => ({ id: "t1", theme: { v1: true } }), "/media/public/celebrations/c1/design": design, "/media/public/": () => ({ items: [] }) });
    expect((await loadPublicPage("ana-luis", "es", client(routes(() => ({ version: 3, document, publishedAt: "2026-11-28T00:00:00Z" })))))?.template).toEqual({ id: "t1", theme: document });
    expect((await loadPublicPage("ana-luis", "es", client(routes(() => ({ version: 1, document: { schemaVersion: 1 } })))))?.template).toEqual({ id: "t1", theme: { v1: true } });
    expect((await loadPublicPage("ana-luis", "es", client(routes(down))))?.template).toEqual({ id: "t1", theme: { v1: true } });
    expect((await loadPublicPage("ana-luis", "es", client({ "/celebrations/public/": () => view, "/media/templates/": () => ({ id: "t1", theme: { v1: true } }), "/media/public/": () => ({ items: [] }) })))?.template).toEqual({ id: "t1", theme: { v1: true } });
  });
  it("is null for an unpublished or unknown slug (404) and still fails loudly when the celebration service itself is down", async () => {
    expect(await loadPublicPage("nope", "es", client({}))).toBeNull();
    await expect(loadPublicPage("x", "es", client({ "/celebrations/public/": down }))).rejects.toBeInstanceOf(ApiError);
  });
});
