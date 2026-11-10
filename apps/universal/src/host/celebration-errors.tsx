import type { ReactNode } from "react";
import { ApiError } from "@rsvp/api-client";
import { useT } from "../platform/providers";
import { ErrorNotice, Notice } from "./ui";

/**
 * Failure notice for the celebration screens. The shared ErrorNotice words every 409 as "someone saved
 * while you were editing"; the Celebration API also answers 409 for a taken slug, an archived
 * celebration and an invalid transition, and those need their own next step. 429 and 5xx get theirs too.
 */
export type ErrorKind = "versionConflict" | "slugTaken" | "slugImmutable" | "archived" | "invalidTransition" | "rateLimited" | "server" | "network" | "other";

const STATUS_CONFLICT = 409;
const STATUS_RATE_LIMITED = 429;
const STATUS_SERVER = 500;
const CODE_KIND: Readonly<Record<string, ErrorKind>> = {
  VERSION_CONFLICT: "versionConflict", SLUG_TAKEN: "slugTaken", SLUG_IMMUTABLE: "slugImmutable", CELEBRATION_ARCHIVED: "archived", INVALID_TRANSITION: "invalidTransition"
};

export function errorKind(error: unknown): ErrorKind {
  if (!error) return "other";
  if (!(error instanceof ApiError)) return "network";
  if (error.status === STATUS_RATE_LIMITED) return "rateLimited";
  if (error.status >= STATUS_SERVER) return "server";
  if (error.status === STATUS_CONFLICT) return CODE_KIND[error.problem?.code ?? ""] ?? "other";
  return "other";
}

export function CelebrationErrorNotice({ error, onReload }: { readonly error: unknown; readonly onReload?: () => void }): ReactNode {
  const t = useT();
  const kind = errorKind(error);
  if (!error) return null;
  if (kind === "other" || kind === "versionConflict") return <ErrorNotice error={error} {...(onReload ? { onReload } : {})} />;
  const seconds = error instanceof ApiError ? error.retryAfterSeconds : undefined;
  const message = kind === "rateLimited" ? (seconds ? t("host.errors.rateLimited", { seconds }) : t("host.errors.rateLimitedNoWait")) : t(`host.errors.${kind}`);
  return <Notice kind="error">{message}</Notice>;
}
