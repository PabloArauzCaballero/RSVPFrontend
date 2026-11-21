import { redactText } from "./redact.js";
import { noOpTelemetry, type Telemetry, type TelemetryEvent } from "./types.js";

export interface OtlpTelemetryOptions {
  /** OTLP/HTTP base URL of the Collector (the same shape as the backend's `OTEL_EXPORTER_OTLP_ENDPOINT`). Empty → reporting off. */
  readonly endpoint: string | undefined | null;
  /** `service.name` of the resource, for example `rsvp-web` or `rsvp-seo-web`. */
  readonly serviceName: string;
  /** `service.version` when the build knows it. */
  readonly serviceVersion?: string;
  /** Reports per page load. A render loop or a broken release must not flood the Collector (default 20). */
  readonly maxReports?: number;
  /** Test hook. */
  readonly fetchImpl?: typeof fetch;
  /** Test hook. */
  readonly now?: () => number;
}

type AnyValue = { stringValue: string } | { intValue: string } | { doubleValue: number } | { boolValue: boolean };

const STACK_LIMIT = 4_000;
const MESSAGE_LIMIT = 500;
const SEVERITY = { error: { number: 17, text: "ERROR" }, info: { number: 9, text: "INFO" } } as const;

const value = (raw: string | number | boolean): AnyValue => {
  if (typeof raw === "boolean") return { boolValue: raw };
  if (typeof raw === "number") return Number.isInteger(raw) ? { intValue: String(raw) } : { doubleValue: raw };
  return { stringValue: redactText(raw) };
};

function describe(error: unknown): { type: string; message: string; stack?: string; correlationId?: string } {
  if (error instanceof Error) {
    const correlationId = (error as { correlationId?: unknown }).correlationId;
    return {
      type: error.name || "Error",
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
      ...(typeof correlationId === "string" ? { correlationId } : {})
    };
  }
  return { type: typeof error, message: typeof error === "string" ? error : "non-Error value thrown" };
}

/**
 * Errors (and the few events the apps choose to `track`) as OTLP/HTTP log records, one request per report, sent to
 * `${endpoint}/v1/logs` like the backend's `OtlpLogSink`. Never personal data: messages and stacks are scrubbed by
 * `redactText`, no user id, email or token is attached, and callers pass route shapes, not URLs.
 * Delivery is best effort: a failure is swallowed, because reporting must never break the screen that is already failing.
 */
export function createOtlpTelemetry(options: OtlpTelemetryOptions): Telemetry {
  const endpoint = options.endpoint?.trim().replace(/\/+$/, "");
  if (!endpoint) return noOpTelemetry;
  const send = options.fetchImpl ?? (typeof fetch === "function" ? fetch.bind(globalThis) : undefined);
  if (!send) return noOpTelemetry;
  const limit = options.maxReports ?? 20;
  const now = options.now ?? Date.now;
  let sent = 0;
  const resource = [{ key: "service.name", value: { stringValue: options.serviceName } }, ...(options.serviceVersion ? [{ key: "service.version", value: { stringValue: options.serviceVersion } }] : [])];

  const emit = (severity: (typeof SEVERITY)[keyof typeof SEVERITY], body: string, attributes: Record<string, string | number | boolean>): void => {
    if (sent >= limit) return;
    sent += 1;
    const record = {
      timeUnixNano: String(now() * 1_000_000),
      severityNumber: severity.number,
      severityText: severity.text,
      body: { stringValue: redactText(body).slice(0, MESSAGE_LIMIT) },
      attributes: Object.entries(attributes).map(([key, raw]) => ({ key, value: value(raw) }))
    };
    const payload = JSON.stringify({ resourceLogs: [{ resource: { attributes: resource }, scopeLogs: [{ scope: { name: "@rsvp/telemetry" }, logRecords: [record] }] }] });
    try {
      void send(`${endpoint}/v1/logs`, { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true, credentials: "omit" }).catch(() => undefined);
    } catch {
      // A synchronous throw from fetch (invalid URL, blocked by policy) is as ignorable as a rejected one.
    }
  };

  return {
    track(event: TelemetryEvent): void {
      emit(SEVERITY.info, event.name, { ...(event.properties ?? {}), ...(event.correlationId ? { "rsvp.correlation_id": event.correlationId } : {}) });
    },
    captureException(error: unknown, context?: Record<string, string>): void {
      const described = describe(error);
      emit(SEVERITY.error, `${described.type}: ${described.message}`, {
        "exception.type": described.type,
        "exception.message": described.message.slice(0, MESSAGE_LIMIT),
        ...(described.stack ? { "exception.stacktrace": described.stack.slice(0, STACK_LIMIT) } : {}),
        ...(described.correlationId ? { "rsvp.correlation_id": described.correlationId } : {}),
        ...(context ?? {})
      });
    }
  };
}
