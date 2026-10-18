import { describe, expect, it, vi } from "vitest";
import { createApiClient, ValidationError } from "@rsvp/api-client";
import { celebrationApi, mediaApi, missingFieldsOf, templateApi, uploadToPresignedUrl, UploadError, invalidation } from "../src/index.js";

interface Call { readonly method: string; readonly path: string; readonly headers: Headers; readonly body: unknown }

function harness(status = 200, body: unknown = {}) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
  }) as unknown as typeof fetch;
  const tokens = { getAccessToken: async () => "access", getRefreshToken: async () => "refresh", setTokens: async () => undefined, clear: async () => undefined };
  return { client: createApiClient({ baseUrl: "http://gateway.test", tokenStore: tokens, refreshSession: { refresh: vi.fn() }, fetchFn }), calls };
}

const target = { id: "c-1", version: 7 };

describe("celebration API", () => {
  it("every write sends the edited version as If-Match", async () => {
    const { client, calls } = harness();
    const api = celebrationApi(client);
    await api.edit(target, { content: { title: "x" } });
    await api.updateSettings(target, { giftReservationMode: "AUTO_ACCEPT" });
    await api.selectTemplate(target, "t-1");
    await api.assignType(target, "BAUTIZO");
    await api.publish(target);
    await api.unpublish(target, "motivo");
    await api.archive(target);
    await api.setCollaborator(target, "u-1", "VIEWER");
    await api.removeCollaborator(target, "u-1");
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "PATCH /celebrations/c-1", "PUT /celebrations/c-1/settings", "PUT /celebrations/c-1/template", "PUT /celebrations/c-1/event-type",
      "POST /celebrations/c-1/publish", "POST /celebrations/c-1/unpublish", "POST /celebrations/c-1/archive", "PUT /celebrations/c-1/collaborators/u-1", "DELETE /celebrations/c-1/collaborators/u-1"
    ]);
    expect(calls.every((call) => call.headers.get("if-match") === '"7"')).toBe(true);
    expect(calls[5]?.body).toEqual({ reason: "motivo" });
  });

  it("reads, admin and language headers", async () => {
    const { client, calls } = harness(200, { items: [] });
    const api = celebrationApi(client);
    await api.list();
    await api.get("c-1");
    await api.create({ slug: "s", eventTypeCode: "WEDDING" });
    await api.publishCheck("c-1");
    await api.audit("c-1");
    await api.eventTypes("en-US");
    await api.eventType("WEDDING");
    await api.adminEventTypes();
    await api.upsertEventType({ code: "GRADUATION", status: "ACTIVE", defaultLocale: "es-BO", hostRoles: ["GRADUATE"], enabledSections: ["story"], requiredFieldsForPublish: ["title"], compatibleTemplateTags: ["graduation"], translations: [{ locale: "es-BO", name: "Graduación" }] });
    await api.replayPublicProjection();
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "GET /celebrations?limit=100", "GET /celebrations/c-1", "POST /celebrations", "GET /celebrations/c-1/publish-check", "GET /celebrations/c-1/audit",
      "GET /celebrations/event-types", "GET /celebrations/event-types/WEDDING", "GET /celebrations/admin/event-types", "PUT /celebrations/admin/event-types/GRADUATION", "POST /celebrations/admin/projections/public/replay"
    ]);
    expect(calls[5]?.headers.get("accept-language")).toBe("en-US");
    expect(calls[5]?.headers.get("authorization")).toBeNull();
    expect(calls[8]?.body).not.toHaveProperty("code");
  });

  it("templates and media", async () => {
    const { client, calls } = harness(200, { items: [] });
    await templateApi(client).compatible(["wedding", "anniversary"]);
    await templateApi(client).get("t-1");
    await templateApi(client).all();
    await templateApi(client).publish({ id: "t-1", version: 1 });
    await templateApi(client).archive({ id: "t-1", version: 2 });
    await templateApi(client).edit({ id: "t-1", version: 3 }, { name: "n" });
    await mediaApi(client).presign({ celebrationId: "c-1", filename: "a.png", contentType: "image/png", sizeBytes: 10 });
    await mediaApi(client).complete("a-1");
    await mediaApi(client).list("c-1");
    await mediaApi(client).reorder("c-1", ["a-2", "a-1"], "a-2");
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "GET /media/templates?eventTypeTags=wedding%2Canniversary", "GET /media/templates/t-1", "GET /media/admin/templates", "POST /media/templates/t-1/publish", "POST /media/templates/t-1/archive",
      "PATCH /media/templates/t-1", "POST /media/uploads/presign", "POST /media/uploads/a-1/complete", "GET /media/celebrations/c-1/assets", "PUT /media/celebrations/c-1/assets/order"
    ]);
    expect(calls[4]?.headers.get("if-match")).toBe('"2"');
    expect(calls[9]?.body).toEqual({ assetIds: ["a-2", "a-1"], coverAssetId: "a-2" });
  });

  it("a publish 422 exposes exactly the missing fields; other errors expose none", async () => {
    const { client } = harness(422, { title: "Missing", status: 422, code: "PUBLISH_REQUIREMENTS_MISSING", missingFields: ["eventDate", "hosts.GROOM"] });
    const error = await celebrationApi(client).publish(target).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ValidationError);
    expect(missingFieldsOf(error)).toEqual(["eventDate", "hosts.GROOM"]);
    expect(missingFieldsOf(new Error("x"))).toEqual([]);
  });

  it("mutations invalidate the celebration, its checklist and its audit", () => {
    expect(invalidation.celebrationChanged("c-1")).toEqual([["celebrations", "c-1"], ["celebrations"], ["celebrations", "c-1", "publish-check"], ["celebrations", "c-1", "audit"]]);
    expect(invalidation.mediaChanged("c-1")).toEqual([["media", "c-1"]]);
  });
});

class FakeXhr {
  static last: FakeXhr | undefined;
  status = 0;
  readonly headers: Record<string, string> = {};
  method = "";
  url = "";
  body: unknown;
  readonly upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { FakeXhr.last = this; }
  open(method: string, url: string) { this.method = method; this.url = url; }
  setRequestHeader(name: string, value: string) { this.headers[name] = value; }
  send(body: unknown) { this.body = body; }
}

describe("direct upload with progress", () => {
  const intent = { assetId: "a-1", objectKey: "k", uploadUrl: "http://minio.test/put", method: "PUT" as const, requiredHeaders: { "Content-Type": "image/png" }, maxBytes: 3 };

  it("PUTs to the presigned URL with its headers and reports progress", async () => {
    const progress: number[] = [];
    const done = uploadToPresignedUrl(intent, new Blob(["abc"], { type: "image/png" }), (fraction) => progress.push(fraction), () => new FakeXhr() as unknown as XMLHttpRequest);
    const xhr = FakeXhr.last as FakeXhr;
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    xhr.status = 200;
    xhr.onload?.();
    await done;
    expect([xhr.method, xhr.url, xhr.headers["Content-Type"]]).toEqual(["PUT", "http://minio.test/put", "image/png"]);
    expect(progress).toEqual([0.5, 1]);
  });

  it("a refused or dropped upload rejects with its status", async () => {
    const refused = uploadToPresignedUrl(intent, new Blob(["abc"]), () => undefined, () => new FakeXhr() as unknown as XMLHttpRequest);
    (FakeXhr.last as FakeXhr).status = 403;
    (FakeXhr.last as FakeXhr).onload?.();
    await expect(refused).rejects.toEqual(new UploadError(403));
    const dropped = uploadToPresignedUrl(intent, new Blob(["abc"]), () => undefined, () => new FakeXhr() as unknown as XMLHttpRequest);
    (FakeXhr.last as FakeXhr).onerror?.();
    await expect(dropped).rejects.toMatchObject({ status: 0 });
  });
});
