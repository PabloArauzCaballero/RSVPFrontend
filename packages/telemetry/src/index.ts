export interface TelemetryEvent { name: string; properties?: Record<string, string | number | boolean>; correlationId?: string; }
export interface Telemetry { track(event: TelemetryEvent): void; captureException(error: unknown, context?: Record<string, string>): void; }
export const noOpTelemetry: Telemetry = { track: () => {}, captureException: () => {} };
