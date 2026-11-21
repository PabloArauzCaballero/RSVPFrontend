/** Operator consoles linked from Operación (E12). */
export interface ObservabilityLink {
  readonly key: "grafana" | "rabbit";
  readonly url: string;
}

/** An absolute http(s) URL, or nothing: no fallback to localhost, which in production points at the visitor's own machine. */
function configured(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * L8: the Grafana and RabbitMQ links appear only when their build variable is set (`EXPO_PUBLIC_GRAFANA_URL`,
 * `EXPO_PUBLIC_RABBITMQ_URL`). Without them the menu offers nothing. The variables are read literally so Expo inlines them.
 */
export function observabilityLinks(): readonly ObservabilityLink[] {
  const grafana = configured(process.env.EXPO_PUBLIC_GRAFANA_URL);
  const rabbit = configured(process.env.EXPO_PUBLIC_RABBITMQ_URL);
  return [...(grafana ? [{ key: "grafana" as const, url: grafana }] : []), ...(rabbit ? [{ key: "rabbit" as const, url: rabbit }] : [])];
}
