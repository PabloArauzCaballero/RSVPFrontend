import { useEffect, useId, useRef, type ComponentProps, type ReactNode, type RefObject } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { StateHint, useTheme, type Input } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import type { GiftItemStatus } from "@rsvp/query-hooks";
import { useT } from "../../platform/providers";
import { ActionButton, ErrorNotice, Notice, styles } from "../ui";

interface FieldProps extends Omit<ComponentProps<typeof Input>, "onChange"> {
  readonly help?: string;
  readonly onChange: (value: string) => void;
  readonly inputRef?: RefObject<TextInput | null>;
}

export function GiftField({ onChange, help, style, error, multiline, inputRef, label, state, ...props }: FieldProps): ReactNode {
  const { styles: themed, palette } = useTheme();
  const id = useId(), helpId = `${id}-help`, errorId = `${id}-error`;
  const disabled = state === "disabled" || state === "loading";
  return <View style={{ gap: spacing[1] }}><Text style={themed.label}>{label}</Text>
    <TextInput {...props} ref={inputRef} multiline={multiline} editable={!disabled} accessibilityState={{ disabled }} aria-invalid={Boolean(error) || undefined} aria-describedby={[help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined} accessibilityLabel={label} onChangeText={onChange} accessibilityHint={help} placeholderTextColor={palette.textMuted}
      style={[themed.input, error && themed.inputError, multiline && { minHeight: 112, paddingVertical: spacing[2], textAlignVertical: "top" }, style]} />
    <View nativeID={errorId}><StateHint error={error} state={state} /></View>
    {help ? <Text nativeID={helpId} style={styles.muted}>{help}</Text> : null}
  </View>;
}

/** Backend detail is diagnostic data, never customer-facing validation copy. */
export function GiftFailure({ error, onRetry }: { readonly error: unknown; readonly onRetry?: () => void }): ReactNode {
  const t = useT();
  if (!error) return null;
  const status = error instanceof ApiError ? error.status : null;
  if (status === 401) return <ErrorNotice error={error} />;
  const key = status === 403 ? "forbidden" : status === 404 ? "missing" : status === 409 ? "conflict" : status === 422 ? "validation" : status === 429 ? "limited" : "unavailable";
  return <Notice kind="error"><Text style={styles.body}>{t(`hostGifts.failure.${key}`)}</Text>
    {onRetry && status !== 403 ? <ActionButton variant="secondary" label={t("hostGifts.refresh")} onPress={onRetry} /> : null}
  </Notice>;
}

export function PublicationLine({ status }: { readonly status: GiftItemStatus }): ReactNode {
  const t = useT();
  const published = ["AVAILABLE", "PENDING_REVIEW", "COMMITTED"].includes(status);
  return <Text style={styles.muted} accessibilityLabel={t("hostGifts.publicStatus")}>{t(published ? "hostGifts.published" : "hostGifts.unpublished")}</Text>;
}

export function GiftFormSummary({ fields }: { readonly fields: readonly { label: string; error?: string; onFocus: () => void }[] }): ReactNode {
  const summary = useRef<View>(null);
  const signature = fields.flatMap((field) => field.error ? [field.error] : []).join("|");
  useEffect(() => { if (signature && Platform.OS === "web") summary.current?.focus(); }, [signature]);
  if (!signature) return null;
  return <View ref={summary} role="alert" tabIndex={-1} style={{ gap: spacing[2] }}>
    {fields.filter((field) => field.error).map((field) => <ActionButton key={field.label} variant="secondary" label={`${field.label}: ${field.error}`} onPress={field.onFocus} />)}
  </View>;
}
