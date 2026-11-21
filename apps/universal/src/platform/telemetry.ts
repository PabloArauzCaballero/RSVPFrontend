import { createOtlpTelemetry, type Telemetry } from "@rsvp/telemetry";

/**
 * Error reporting of the app (M11). `EXPO_PUBLIC_OTLP_ENDPOINT` is the OTLP/HTTP base URL of a Collector reachable from
 * the browser or the phone (CORS open to the app's origin); it is inlined at build time. Without it reporting is off and
 * nothing leaves the device. The variable must be read literally (`process.env.EXPO_PUBLIC_…`) for Expo to inline it.
 */
export const appTelemetry: Telemetry = createOtlpTelemetry({
  endpoint: process.env.EXPO_PUBLIC_OTLP_ENDPOINT,
  serviceName: "rsvp-universal"
});
