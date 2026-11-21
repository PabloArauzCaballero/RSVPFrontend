import { createOtlpTelemetry, routeShape, type Telemetry } from "@rsvp/telemetry";

/**
 * Browser error reporting of the public site (M11). `NEXT_PUBLIC_OTLP_ENDPOINT` is the OTLP/HTTP base URL of a Collector
 * reachable from the visitor's browser (CORS open to the site's origin), inlined at build time. Without it, reporting is
 * off and nothing is sent.
 */
export const siteTelemetry: Telemetry = createOtlpTelemetry({ endpoint: process.env.NEXT_PUBLIC_OTLP_ENDPOINT, serviceName: "rsvp-seo-web" });

/** One report for an error a boundary caught: the route shape and Next's digest, never the URL or personal data. */
export function reportBoundaryError(error: Error & { digest?: string }, boundary: "route" | "global", telemetry: Telemetry = siteTelemetry): void {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  telemetry.captureException(error, { boundary, route: routeShape(path), ...(error.digest ? { digest: error.digest } : {}) });
}
