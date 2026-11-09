import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { ActionButton, ConfirmDialog, EmptyState, Field, Notice, useStyles } from "../host/ui";
import type { IllustrationName } from "@rsvp/ui";
import { useLocale, useT } from "../platform/providers";
import { failureKind, isRetryable } from "../provider/errors";
import { RowsSkeleton } from "../provider/parts";

/** The body of an admin screen: one rhythm between the intro, the filters and the list, on the page measure (the same edges as the header and its primary action). */
export function Stack({ children }: { readonly children: ReactNode }): ReactNode {
  return <View style={{ gap: spacing[6], width: "100%" }}>{children}</View>;
}

/** Backend codes that have their own copy under admin.errors.code. */
const CODED: readonly string[] = ["INVALID_PARENT", "INVALID_TRANSITION", "OUTSIDE_AVAILABILITY", "CODE_TAKEN"];
const MESSAGE_BY_STATUS: Readonly<Record<number, string>> = { 401: "unauthorized", 403: "forbidden", 404: "notFound", 409: "conflict", 400: "invalid", 422: "invalid" };

/** Admin wording for an API failure (the host copy talks about celebrations). 409 offers the reload. */
export function AdminErrorNotice({ error, onReload, onRetry }: { readonly error: unknown; readonly onReload?: () => void; readonly onRetry?: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  if (!error) return null;
  const kind = failureKind(error);
  if (kind !== "other") {
    const seconds = error instanceof ApiError ? error.retryAfterSeconds : undefined;
    const retry = onRetry ?? onReload;
    return (
      <Notice kind="error">
        <Text style={styles.body}>{kind === "rateLimited" ? (seconds ? t("admin.errors.rateLimited", { seconds }) : t("admin.errors.rateLimitedNoWait")) : t(`admin.errors.${kind}`)}</Text>
        {isRetryable(kind) && retry ? <ActionButton variant="secondary" label={t("host.common.retry")} onPress={retry} testID="error-retry" /> : null}
      </Notice>
    );
  }
  const code = error instanceof ApiError ? error.problem?.code ?? "" : "";
  if (CODED.includes(code)) return <Notice kind="error"><Text style={styles.body}>{t(`admin.errors.code.${code}`)}</Text></Notice>;
  const key = error instanceof ApiError ? MESSAGE_BY_STATUS[error.status] ?? "generic" : "generic";
  return (
    <Notice kind="error">
      <Text style={styles.body}>{t(`admin.errors.${key}`)}</Text>
      {key === "conflict" && onReload ? <ActionButton variant="secondary" label={t("host.common.reload")} onPress={onReload} /> : null}
    </Notice>
  );
}

/** Pictures for a whole list that failed: the one that says what kind of failure it was. Only failures worth retrying get one; the rest stay a notice. */
const FAILURE_ART: Readonly<Record<string, IllustrationName>> = { network: "offline", server: "serverError", unavailable: "maintenance", rateLimited: "maintenance" };

/** Failure of a whole list: the picture for the kind of failure (offline, server, maintenance) with one retry; other failures stay a notice with its next step. */
export function AdminListError({ error, onRetry, retryTestID = "admin-retry" }: { readonly error: unknown; readonly onRetry: () => void; readonly retryTestID?: string }): ReactNode {
  const t = useT();
  if (!error) return null;
  const kind = failureKind(error);
  const art = FAILURE_ART[kind];
  if (art && kind !== "rateLimited") {
    return <EmptyState illustration={art} title={t(`admin.errors.state.${kind}`)} body={t(`admin.errors.${kind}`)} action={<ActionButton variant="secondary" label={t("host.common.retry")} onPress={onRetry} testID={retryTestID} />} />;
  }
  return (
    <>
      <AdminErrorNotice error={error} onReload={onRetry} />
      <ActionButton variant="secondary" label={t("host.common.retry")} onPress={onRetry} testID={retryTestID} />
    </>
  );
}

/** Loading (row-shaped skeleton) / error (403, 409, 5xx with retry) / empty / data, in one place so every admin list behaves alike. */
export function QueryBoundary<TData extends { readonly items: readonly unknown[] }>({ query, empty, emptyTitle, illustration = "emptySearch", skeletonRows = 4, avatar = false, children }: {
  readonly query: { readonly isPending: boolean; readonly error: unknown; readonly data: TData | undefined; readonly refetch: () => unknown };
  readonly empty: string;
  /** Replaces "Nothing here" when the empty list is good news (a clear queue). */
  readonly emptyTitle?: string;
  readonly illustration?: IllustrationName;
  readonly skeletonRows?: number;
  readonly avatar?: boolean;
  readonly children: (data: TData) => ReactNode;
}): ReactNode {
  const t = useT();
  if (query.isPending) return <RowsSkeleton count={skeletonRows} minHeight={88} avatar={avatar} />;
  if (query.error) return <AdminListError error={query.error} onRetry={() => { void query.refetch(); }} />;
  if (!query.data || query.data.items.length === 0) return <EmptyState illustration={illustration} title={emptyTitle ?? t("admin.common.emptyTitle")} body={empty} />;
  return <>{children(query.data)}</>;
}

/** A confirmation that asks for a written reason; an empty reason is refused in place and the dialog stays open. */
export function ReasonDialog({ visible, title, body, confirmLabel, onConfirm, onCancel }: {
  readonly visible: boolean; readonly title: string; readonly body: string; readonly confirmLabel: string;
  readonly onConfirm: (reason: string) => void; readonly onCancel: () => void;
}): ReactNode {
  const t = useT();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const close = (): void => { setReason(""); setTouched(false); onCancel(); };
  return (
    <ConfirmDialog visible={visible} danger title={title} body={body} confirmLabel={confirmLabel} onCancel={close}
      onConfirm={() => { if (!reason.trim()) { setTouched(true); return; } const value = reason.trim(); setReason(""); setTouched(false); onConfirm(value); }}>
      <Field label={t("admin.common.reason")} value={reason} onChange={setReason} multiline testID="admin-reason" {...(touched && !reason.trim() ? { error: t("admin.common.reasonRequired") } : {})} />
    </ConfirmDialog>
  );
}

/** Instants from the platform are shown in the viewer's own time zone with a short format. */
export function useStamp(): (iso: string) => string {
  const locale = useLocale();
  return (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
}
