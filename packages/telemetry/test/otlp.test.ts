import { describe, expect, it, vi } from "vitest";
import { createOtlpTelemetry, noOpTelemetry, redactText, routeShape } from "../src/index.js";

type Sent = { url: string; init: RequestInit };

function capture(): { fetchImpl: typeof fetch; sent: Sent[] } {
  const sent: Sent[] = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => { sent.push({ url: String(url), init: init ?? {} }); return new Response(null, { status: 200 }); }) as unknown as typeof fetch;
  return { fetchImpl, sent };
}

const recordOf = (sent: Sent) => (JSON.parse(String(sent.init.body)) as { resourceLogs: { resource: { attributes: { key: string; value: Record<string, unknown> }[] }; scopeLogs: { logRecords: { severityText: string; body: { stringValue: string }; attributes: { key: string; value: Record<string, unknown> }[] }[] }[] }[] }).resourceLogs[0]!;
const attr = (attributes: { key: string; value: Record<string, unknown> }[], key: string) => attributes.find((entry) => entry.key === key)?.value;

describe("createOtlpTelemetry", () => {
  it("is off (no-op, no request) without an endpoint", () => {
    const { fetchImpl, sent } = capture();
    for (const endpoint of [undefined, null, "", "   "]) {
      const telemetry = createOtlpTelemetry({ endpoint, serviceName: "rsvp-web", fetchImpl });
      expect(telemetry).toBe(noOpTelemetry);
      telemetry.captureException(new Error("boom"));
    }
    expect(sent).toHaveLength(0);
  });

  it("sends one OTLP/HTTP log record per error to {endpoint}/v1/logs, with the service and the route shape", () => {
    const { fetchImpl, sent } = capture();
    const telemetry = createOtlpTelemetry({ endpoint: "https://otel.example.test/", serviceName: "rsvp-web", serviceVersion: "1.2.3", fetchImpl, now: () => 1_700_000_000_000 });
    const error = Object.assign(new TypeError("Cannot read properties of undefined"), { correlationId: "corr-1" });
    telemetry.captureException(error, { route: "/(host)/celebraciones", boundary: "root" });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe("https://otel.example.test/v1/logs");
    expect(sent[0]!.init.method).toBe("POST");
    expect(sent[0]!.init.credentials).toBe("omit");
    const resourceLogs = recordOf(sent[0]!);
    expect(attr(resourceLogs.resource.attributes, "service.name")).toEqual({ stringValue: "rsvp-web" });
    expect(attr(resourceLogs.resource.attributes, "service.version")).toEqual({ stringValue: "1.2.3" });
    const record = resourceLogs.scopeLogs[0]!.logRecords[0]!;
    expect(record.severityText).toBe("ERROR");
    expect(record.body.stringValue).toBe("TypeError: Cannot read properties of undefined");
    expect(attr(record.attributes, "exception.type")).toEqual({ stringValue: "TypeError" });
    expect(attr(record.attributes, "rsvp.correlation_id")).toEqual({ stringValue: "corr-1" });
    expect(attr(record.attributes, "route")).toEqual({ stringValue: "/(host)/celebraciones" });
    expect(attr(record.attributes, "exception.stacktrace")).toBeDefined();
  });

  it("never ships personal data: emails, phones, tokens and URL queries in messages are scrubbed", () => {
    const { fetchImpl, sent } = capture();
    const telemetry = createOtlpTelemetry({ endpoint: "https://otel.example.test", serviceName: "rsvp-web", fetchImpl });
    telemetry.captureException(new Error("ana.perez@example.com +591 70012345 failed GET https://api.example.test/guests?token=s3cr3t&x=1 with 9f1c2b7e8a6d4c3b2a1f0e9d8c7b6a5f"));
    const body = String(sent[0]!.init.body);
    for (const secret of ["ana.perez@example.com", "70012345", "s3cr3t", "9f1c2b7e8a6d4c3b2a1f0e9d8c7b6a5f"]) expect(body).not.toContain(secret);
    expect(body).toContain("[email]");
    expect(body).toContain("https://api.example.test/guests?[redacted]");
  });

  it("caps reports per page load so a render loop cannot flood the Collector", () => {
    const { fetchImpl, sent } = capture();
    const telemetry = createOtlpTelemetry({ endpoint: "https://otel.example.test", serviceName: "rsvp-web", fetchImpl, maxReports: 3 });
    for (let index = 0; index < 10; index += 1) telemetry.captureException(new Error(`e${index}`));
    expect(sent).toHaveLength(3);
  });

  it("swallows delivery failures (rejected or thrown) and non-Error values", async () => {
    const rejecting = vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    const throwing = vi.fn(() => { throw new Error("blocked"); }) as unknown as typeof fetch;
    expect(() => createOtlpTelemetry({ endpoint: "https://x.test", serviceName: "s", fetchImpl: rejecting }).captureException("plain string")).not.toThrow();
    expect(() => createOtlpTelemetry({ endpoint: "https://x.test", serviceName: "s", fetchImpl: throwing }).captureException({ odd: true })).not.toThrow();
    await Promise.resolve();
    expect(rejecting).toHaveBeenCalledTimes(1);
  });

  it("track sends an INFO record with its properties", () => {
    const { fetchImpl, sent } = capture();
    createOtlpTelemetry({ endpoint: "https://otel.example.test", serviceName: "rsvp-web", fetchImpl }).track({ name: "boundary.retry", properties: { ok: true, count: 2, ratio: 0.5 }, correlationId: "c-9" });
    const record = recordOf(sent[0]!).scopeLogs[0]!.logRecords[0]!;
    expect(record.severityText).toBe("INFO");
    expect(attr(record.attributes, "ok")).toEqual({ boolValue: true });
    expect(attr(record.attributes, "count")).toEqual({ intValue: "2" });
    expect(attr(record.attributes, "ratio")).toEqual({ doubleValue: 0.5 });
    expect(attr(record.attributes, "rsvp.correlation_id")).toEqual({ stringValue: "c-9" });
  });
});

describe("routeShape and redactText", () => {
  it("keeps the area and pattern segments, drops data segments and the query", () => {
    expect(routeShape("/c/boda-ana/rsvp/abc?x=1#y")).toBe("/c/:/:/:");
    expect(routeShape("/(host)/[id]/editar")).toBe("/(host)/[id]/:");
    expect(routeShape("")).toBe("/");
  });

  it("leaves ordinary words alone", () => {
    expect(redactText("Cannot read properties of undefined (reading 'map')")).toBe("Cannot read properties of undefined (reading 'map')");
  });
});
