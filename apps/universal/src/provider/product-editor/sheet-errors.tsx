import { useState, type ReactNode } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { PhotoInputError, PhotoTimeoutError, PhotoUploadError, sheetProblemDetails, type MissingCode } from "@rsvp/query-hooks";
import type { Translate } from "@rsvp/i18n";
import { ImagePermissionError } from "../../platform/image-permission-error";
import { useT } from "../../platform/providers";
import { ActionButton, Notice, useStyles } from "../../host/ui";
import { PortalErrorNotice } from "../errors";

/** Catalog codes of the product sheet that have their own wording under `portal.product.errors` (provider-catalog 3.5.0). */
export const SHEET_CODES = [
  "LISTING_INCOMPLETE", "CONTACT_IN_TEXT", "DESCRIPTION_REPEATS_TITLE", "PRICE_OUT_OF_RANGE", "GIFT_IDEA_NOT_ALLOWED", "UNKNOWN_CITY", "UNKNOWN_TEMPLATE_VARIABLE",
  "CATEGORY_TYPE_MISMATCH", "VERSION_CONFLICT", "IF_MATCH_REQUIRED", "LISTING_HIDDEN", "LISTING_NOT_EDITABLE", "IDEMPOTENCY_KEY_REUSED",
  "PHOTO_LIMIT_REACHED", "MEDIA_QUOTA_EXCEEDED", "UNSUPPORTED_MEDIA_TYPE", "PHOTO_TOO_LARGE", "PHOTO_MISMATCH", "MEDIA_STORAGE_NOT_CONFIGURED", "UPLOAD_NOT_FOUND",
  "INVALID_DESTINATION", "DESTINATION_REQUIRED", "IMAGE_URL_NOT_ALLOWED", "INVALID_LISTING"
] as const;
const RELOAD_CODES = new Set(["VERSION_CONFLICT", "IF_MATCH_REQUIRED"]);
const PHOTO_PUT_FORBIDDEN = 403;

/** Pure: the sentence for a sheet failure, or null when the portal's generic notice words it better (network, 5xx, 401…). */
export function sheetErrorMessage(error: unknown, t: Translate): string | null {
  if (error instanceof ImagePermissionError) return t("portal.product.photos.permissionDenied");
  if (error instanceof PhotoInputError) return t(error.code === "PHOTO_TYPE" ? "portal.product.photos.typeError" : "portal.product.photos.sizeError");
  if (error instanceof PhotoUploadError) return t(error.status === PHOTO_PUT_FORBIDDEN ? "portal.product.errors.PHOTO_MISMATCH" : "portal.product.photos.putFailed");
  if (error instanceof PhotoTimeoutError) return t("portal.product.photos.timeout");
  if (!(error instanceof ApiError)) return null;
  const code = error.problem?.code ?? "";
  if (!(SHEET_CODES as readonly string[]).includes(code)) return null;
  const details = sheetProblemDetails(error);
  // CONTACT_IN_TEXT names the field the catalog found the phone or link in (`titles.es-BO`, `variants[0].label`, `whatsappTemplate.es-BO`…).
  const where = code === "CONTACT_IN_TEXT" ? contactFieldKey(details.field) : null;
  if (where) return t("portal.product.errors.CONTACT_IN_TEXT_AT", { where: t(`portal.product.errors.contactFields.${where}`), fragment: details.fragment ?? "" });
  return t(`portal.product.errors.${code}`, { fragment: details.fragment ?? "", variable: details.variable ?? "" });
}

/** The i18n key under `contactFields` for a field of the catalog's `details.field`, or null when it is not one the portal names. */
export function contactFieldKey(field: string | undefined): "titles" | "descriptions" | "details" | "variants" | "delivery" | "template" | "altText" | null {
  if (!field) return null;
  if (field.startsWith("titles")) return "titles";
  if (field.startsWith("descriptions")) return "descriptions";
  if (field.startsWith("details")) return "details";
  if (field.startsWith("variants")) return "variants";
  if (field.startsWith("delivery")) return "delivery";
  if (field.startsWith("whatsappTemplate")) return "template";
  if (field === "altText") return "altText";
  return null;
}

export const needsReload = (error: unknown): boolean => error instanceof ApiError && RELOAD_CODES.has(error.problem?.code ?? "");

/** The sheet's failure next to the action that caused it: what happened, what was refused, and the way out (reload, retry, the missing list). */
export function SheetErrorNotice({ error, onReload, onRetry, onMissing }: { readonly error: unknown; readonly onReload?: () => void; readonly onRetry?: () => void; readonly onMissing?: (missing: readonly MissingCode[]) => ReactNode }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [settingsFailed, setSettingsFailed] = useState(false);
  if (!error) return null;
  const message = sheetErrorMessage(error, t);
  // Only a device can open its own settings; on the web the browser has no photo permission to give back.
  const settings = error instanceof ImagePermissionError && Platform.OS !== "web" ? <ActionButton icon="settings" variant="secondary" label={t("portal.product.photos.openSettings")} onPress={() => { setSettingsFailed(false); Linking.openSettings().catch(() => setSettingsFailed(true)); }} testID="photo-open-settings" /> : null;
  if (message === null) return <PortalErrorNotice error={error} {...(onReload ? { onReload } : {})} {...(onRetry ? { onRetry } : {})} />;
  const missing = error instanceof ApiError && error.problem?.code === "LISTING_INCOMPLETE" ? sheetProblemDetails(error).missing ?? [] : [];
  return (
    <Notice kind="error">
      <View style={{ gap: spacing[2] }} testID="sheet-error">
        <Text style={styles.body}>{message}</Text>
        {settings}
        {settings && settingsFailed ? <Text role="alert" style={styles.body} testID="photo-open-settings-failed">{t("portal.product.photos.openSettingsFailed")}</Text> : null}
        {missing.length && onMissing ? onMissing(missing) : null}
        {needsReload(error) && onReload ? <ActionButton icon="refresh" variant="secondary" label={t("portal.product.actions.reload")} onPress={onReload} testID="sheet-reload" /> : null}
      </View>
    </Notice>
  );
}
