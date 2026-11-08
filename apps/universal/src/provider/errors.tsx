import type { ReactNode } from "react";
import { Text } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { useT } from "../platform/providers";
import { ActionButton, EmptyState, ErrorNotice, Notice, useStyles } from "../host/ui";

/**
 * Failure notice for the provider portal and the admin screens. The shared ErrorNotice words every 5xx as "an error" and does not
 * know 429 (Retry-After), a network failure or the catalog's own 409/403 codes, so each one gets here the wording and the next
 * step it needs; anything else falls back to the shared notice.
 */
export type FailureKind = "network" | "rateLimited" | "unavailable" | "server" | "storage" | "transition" | "notOwner" | "planAdmin" | "other";

const STATUS_FORBIDDEN = 403;
const STATUS_CONFLICT = 409;
const STATUS_RATE_LIMITED = 429;
const STATUS_UNAVAILABLE = 503;
const STATUS_SERVER = 500;

/** Pure: which wording an error needs. A non-ApiError thrown by fetch (offline, CORS-less gateway answer) is a network failure. */
export function failureKind(error: unknown): FailureKind {
  if (!error) return "other";
  if (!(error instanceof ApiError)) return "network";
  const code = error.problem?.code ?? "";
  if (error.status === STATUS_RATE_LIMITED) return "rateLimited";
  if (code === "STORAGE_NOT_CONFIGURED") return "storage";
  if (error.status === STATUS_UNAVAILABLE) return "unavailable";
  if (error.status >= STATUS_SERVER) return "server";
  if (error.status === STATUS_CONFLICT && code === "INVALID_PROVIDER_TRANSITION") return "transition";
  if (error.status === STATUS_FORBIDDEN && code === "PROVIDER_OWNER_REQUIRED") return "notOwner";
  if (error.status === STATUS_FORBIDDEN && code === "PLAN_ADMIN_REQUIRED") return "planAdmin";
  return "other";
}

/** Whether trying the same request again can succeed without the person changing anything. */
export const isRetryable = (kind: FailureKind): boolean => kind === "network" || kind === "rateLimited" || kind === "unavailable" || kind === "server";

/** Whole-section failure (a list that could not load): the amiable picture for the kind of failure, what happened and one way to try again. */
export function PortalErrorState({ error, onRetry }: { readonly error: unknown; readonly onRetry: () => void }): ReactNode {
  const t = useT();
  if (!error) return null;
  const kind = failureKind(error);
  if (kind === "other" || kind === "rateLimited") return <PortalErrorNotice error={error} onReload={onRetry} onRetry={onRetry} />;
  const illustration = kind === "network" ? "offline" : kind === "server" ? "serverError" : "maintenance";
  const title = t(`portal.errors.state.${kind === "network" || kind === "server" || kind === "storage" ? kind : "unavailable"}`);
  return <EmptyState illustration={illustration} title={title} body={t(`portal.errors.${kind}`)} action={isRetryable(kind) ? <ActionButton variant="secondary" label={t("portal.errors.retry")} onPress={onRetry} testID="error-retry" /> : undefined} />;
}

export function PortalErrorNotice({ error, onReload, onRetry }: { readonly error: unknown; readonly onReload?: () => void; readonly onRetry?: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  if (!error) return null;
  const kind = failureKind(error);
  if (kind === "other") return <ErrorNotice error={error} {...(onReload ? { onReload } : {})} />;
  const seconds = error instanceof ApiError ? error.retryAfterSeconds : undefined;
  const message = kind === "rateLimited" ? (seconds ? t("portal.errors.rateLimited", { seconds }) : t("portal.errors.rateLimitedNoWait")) : t(`portal.errors.${kind}`);
  const retry = onRetry ?? onReload;
  return (
    <Notice kind="error">
      <Text style={styles.body}>{message}</Text>
      {isRetryable(kind) && retry ? <ActionButton variant="secondary" label={t("portal.errors.retry")} onPress={retry} testID="error-retry" /> : null}
    </Notice>
  );
}
