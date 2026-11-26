import { useRef, useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { useColors } from "@rsvp/ui";
import {
  MAX_PHOTOS, MAX_PHOTOS_PER_VARIANT, newIdempotencyKey, photoInputProblem, PhotoInputError, useDeleteListingPhoto, useUploadListingPhoto,
  type ListingPhoto, type PhotoStage, type ProductSheet, type ProductVariant, type UploadPhotoVariables
} from "@rsvp/query-hooks";
import type { AppLocale } from "@rsvp/i18n/server";
import { useApiClient, useT } from "../../platform/providers";
import { pickImage } from "../../platform/pick-image";
import { ActionButton, Field, FilterSelect, useStyles } from "../../host/ui";
import { SheetErrorNotice } from "./sheet-errors";

const THUMB = 72;
/** Rejected photos stop counting against the 5 (the server frees them); a photo being removed is on its way out too. */
export const activePhotos = (photos: readonly ListingPhoto[] | undefined): readonly ListingPhoto[] => (photos ?? []).filter((photo) => photo.status !== "REJECTED" && photo.status !== "DELETING");
/** The photos a version already shows, counted like the server does (3 per version, §5.1). */
export const variantPhotoCount = (photos: readonly ListingPhoto[] | undefined, variantId: string): number => activePhotos(photos).filter((photo) => photo.variantId === variantId).length;
const WHOLE_PRODUCT = "";

function PhotoRow({ photo, index, cover, variant, busy, onCover, onDelete }: { readonly photo: ListingPhoto; readonly index: number; readonly cover: boolean; readonly variant: string | null; readonly busy: boolean; readonly onCover: () => void; readonly onDelete: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const thumb = photo.renditions?.thumb.url;
  const status = t(`portal.product.photos.status.${photo.status}`);
  const reason = photo.status === "REJECTED" && photo.rejectReason ? t(`portal.product.photos.reject.${photo.rejectReason}`) : null;
  const name = t("portal.product.photos.photo", { n: index + 1 });
  return (
    <View role="listitem" style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[3], borderTopWidth: index === 0 ? 0 : 1, borderTopColor: palette.border }} testID={`photo-${photo.id}`}>
      {thumb ? (
        <Image source={{ uri: thumb }} accessibilityLabel={photo.altText ?? name} style={{ width: THUMB, height: THUMB, borderRadius: radius.md }} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={{ width: THUMB, height: THUMB, borderRadius: radius.md, backgroundColor: palette.surfaceMuted }} />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
        <Text style={styles.itemTitle}>{[name, cover ? t("portal.product.photos.cover") : null, variant].filter(Boolean).join(" · ")}</Text>
        <Text style={styles.muted} testID={`photo-status-${photo.id}`}>{reason ? `${status}. ${reason}` : status}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2], paddingTop: spacing[1] }}>
          {photo.status === "READY" && !cover ? <ActionButton variant="secondary" icon="arrow" label={t("portal.product.photos.makeCover")} disabled={busy} onPress={onCover} testID={`photo-cover-${photo.id}`} /> : null}
          {photo.status !== "DELETING" ? <ActionButton variant="secondary" icon="trash" label={t("portal.product.photos.delete", { n: index + 1 })} disabled={busy} onPress={onDelete} testID={`photo-delete-${photo.id}`} /> : null}
        </View>
      </View>
    </View>
  );
}

/**
 * §5.2 · 1 to 5 photos, uploaded from the device (never a link to someone else's image). Each upload goes register → PUT → complete
 * → wait until READY or REJECTED, with its stage read aloud; a refused file never reaches the server. The first READY photo is the
 * cover; «Usar como portada» reorders through the sheet's PATCH (`onReorder`), which carries the If-Match of the loaded version.
 * With versions (§5.1, decision 13) the provider says which version a photo shows (`variantId`, 3 per version); the default is
 * the whole product.
 */
export function PhotoUploader({ sheet, providerId, locale, reordering, onReorder }: {
  readonly sheet: ProductSheet; readonly providerId: string; readonly locale: AppLocale; readonly reordering: boolean; readonly onReorder: (order: readonly string[]) => void;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const upload = useUploadListingPhoto(client, providerId, sheet.id, locale);
  const remove = useDeleteListingPhoto(client, providerId, sheet.id, locale);
  const [alt, setAlt] = useState("");
  const [stage, setStage] = useState<PhotoStage | null>(null);
  const [localError, setLocalError] = useState<unknown>(null);
  const [readyNote, setReadyNote] = useState(false);
  const [variantId, setVariantId] = useState<string>(WHOLE_PRODUCT);
  const last = useRef<UploadPhotoVariables | null>(null);
  const photos = sheet.photos ?? [];
  const variants: readonly ProductVariant[] = sheet.variants ?? [];
  // A version removed in «Precio y versiones» cannot be chosen any more; the photo falls back to the whole product.
  const chosen = variants.some((variant) => variant.id === variantId) ? variantId : WHOLE_PRODUCT;
  const variantLabel = (id: string | null): string | null => variants.find((variant) => variant.id === id)?.label ?? null;
  const active = activePhotos(photos);
  const coverId = photos.find((photo) => photo.status === "READY")?.id;
  const full = active.length >= MAX_PHOTOS;
  const variantFull = chosen !== WHOLE_PRODUCT && variantPhotoCount(photos, chosen) >= MAX_PHOTOS_PER_VARIANT;
  const busy = upload.isPending || remove.isPending || reordering;

  const send = (variables: UploadPhotoVariables): void => {
    last.current = variables;
    setReadyNote(false);
    upload.mutate(variables, {
      onSuccess: (photo) => { setReadyNote(photo?.status === "READY"); if (photo?.status === "READY") setAlt(""); },
      onSettled: () => setStage(null)
    });
  };
  const choose = async (): Promise<void> => {
    setLocalError(null); upload.reset(); remove.reset();
    let picked: Awaited<ReturnType<typeof pickImage>>;
    try { picked = await pickImage({ throwOnDenied: true }); } catch (error) { setLocalError(error); return; }
    if (!picked) return;
    const problem = photoInputProblem({ type: picked.type, size: picked.file.size });
    if (problem) { setLocalError(new PhotoInputError(problem)); return; }
    send({ file: picked.file, contentType: picked.type, idempotencyKey: newIdempotencyKey(), ...(alt.trim() ? { altText: alt.trim() } : {}), ...(chosen ? { variantId: chosen } : {}), onStage: setStage });
  };
  const makeCover = (photoId: string): void => onReorder([photoId, ...photos.map((photo) => photo.id).filter((id) => id !== photoId)]);

  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("portal.product.photos.intro")}</Text>
      <Text style={styles.muted} testID="photo-count">{t("portal.product.photos.count", { count: active.length, max: MAX_PHOTOS })}</Text>
      {photos.length ? (
        <View role="list" aria-label={t("portal.product.steps.photos")}>
          {photos.map((photo, index) => <PhotoRow key={photo.id} photo={photo} index={index} cover={photo.id === coverId} variant={variantLabel(photo.variantId)} busy={busy} onCover={() => makeCover(photo.id)} onDelete={() => { setReadyNote(false); remove.mutate(photo.id); }} />)}
        </View>
      ) : <Text style={styles.muted}>{t("portal.product.photos.empty")}</Text>}
      {full ? <Text style={styles.muted} testID="photo-limit">{t("portal.product.photos.limit")}</Text> : (
        <View style={{ gap: spacing[3] }}>
          {variants.length ? (
            <View style={{ gap: spacing[1] }}>
              <Text style={styles.label}>{t("portal.product.photos.shows")}</Text>
              <FilterSelect label={t("portal.product.photos.shows")} value={chosen} onChange={setVariantId}
                options={[{ value: WHOLE_PRODUCT, label: t("portal.product.photos.wholeProduct") }, ...variants.map((variant) => ({ value: variant.id, label: variant.label }))]} testID="photo-variant" />
              <Text style={styles.muted}>{t("portal.product.photos.showsHelp")}</Text>
            </View>
          ) : null}
          <Field label={t("portal.product.photos.alt")} value={alt} onChange={setAlt} help={t("portal.product.photos.altHelp")} maxLength={200} testID="photo-alt" />
          {variantFull ? <Text style={styles.muted} testID="photo-variant-limit">{t("portal.product.photos.variantLimit", { variant: variantLabel(chosen) ?? "", max: MAX_PHOTOS_PER_VARIANT })}</Text> : null}
          <View style={{ alignSelf: "flex-start" }}>
            <ActionButton variant="secondary" icon="upload" label={t("portal.product.photos.add")} busy={upload.isPending} disabled={busy || variantFull} onPress={() => { void choose(); }} testID="photo-add" />
          </View>
        </View>
      )}
      <Text accessibilityLiveRegion="polite" role="status" style={styles.muted} testID="photo-stage">{stage ? t(`portal.product.photos.stage.${stage}`) : readyNote ? t("portal.product.photos.ready") : ""}</Text>
      <SheetErrorNotice error={localError ?? upload.error ?? remove.error} {...(upload.error && last.current ? { onRetry: () => { if (last.current) send(last.current); } } : {})} />
    </View>
  );
}
