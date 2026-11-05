import { useState, type ReactNode } from "react";
import { Text } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { ActionButton, ConfirmDialog, Field, Loading, Notice, styles } from "../host/ui";
import { useLocale, useT } from "../platform/providers";

const MESSAGE_BY_STATUS: Readonly<Record<number, string>> = { 401: "unauthorized", 403: "forbidden", 404: "notFound", 409: "conflict", 400: "invalid", 422: "invalid" };

/** Admin wording for an API failure (the host copy talks about celebrations). 409 offers the reload. */
export function AdminErrorNotice({ error, onReload }: { readonly error: unknown; readonly onReload?: () => void }): ReactNode {
  const t = useT();
  if (!error) return null;
  const key = error instanceof ApiError ? MESSAGE_BY_STATUS[error.status] ?? "generic" : "generic";
  return (
    <Notice kind="error">
      <Text style={styles.body}>{t(`admin.errors.${key}`)}</Text>
      {key === "conflict" && onReload ? <ActionButton variant="secondary" label={t("host.common.reload")} onPress={onReload} /> : null}
    </Notice>
  );
}

/** Loading / error (403, 409, 5xx with retry) / empty / data, in one place so every admin list behaves alike. */
export function QueryBoundary<TData extends { readonly items: readonly unknown[] }>({ query, empty, children }: {
  readonly query: { readonly isPending: boolean; readonly error: unknown; readonly data: TData | undefined; readonly refetch: () => unknown };
  readonly empty: string;
  readonly children: (data: TData) => ReactNode;
}): ReactNode {
  const t = useT();
  if (query.isPending) return <Loading />;
  if (query.error) {
    return (
      <>
        <AdminErrorNotice error={query.error} onReload={() => { void query.refetch(); }} />
        <ActionButton variant="secondary" label={t("host.common.retry")} onPress={() => { void query.refetch(); }} testID="admin-retry" />
      </>
    );
  }
  if (!query.data || query.data.items.length === 0) return <Notice>{empty}</Notice>;
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

/** Instants from the platform are shown in UTC and say so: an admin works across cities. */
export function useStamp(): (iso: string) => string {
  const locale = useLocale();
  return (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return `${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date)} UTC`;
  };
}
