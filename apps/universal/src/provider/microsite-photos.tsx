import { useId, useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { useColors } from "@rsvp/ui";
import {
  activeMedia, MAX_GALLERY_PHOTOS, MAX_LOGOS, newIdempotencyKey, PHOTO_TYPES, photoInputProblem, PhotoInputError, useDeleteProviderMedia, useProviderMedia, useUploadProviderMedia,
  type Microsite, type PhotoStage, type ProviderMedia, type ProviderMediaPurpose
} from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { pickImage } from "../platform/pick-image";
import { FileDropArea, supportsFileDrop, type DragState } from "../platform/file-drop";
import { toPickedDrop } from "../platform/pick-media";
import { ActionButton, Field, Notice, useStyles } from "../host/ui";
import { SheetErrorNotice } from "./product-editor/sheet-errors";

const THUMB = 72;
/** What the profile shows: the gallery (in order) and the logo. The photos are uploaded files named by id; the server derives their address. */
export interface Pictures {
  readonly gallery: readonly { readonly mediaId: string; readonly url?: string; readonly alt?: Readonly<Record<string, string>> }[];
  readonly logo: Microsite["logo"];
}
export const picturesOf = (microsite: Microsite): Pictures => ({ gallery: microsite.gallery, logo: microsite.logo ?? null });
const cardOf = (photo: ProviderMedia): string => photo.renditions?.card.url ?? "";

function Thumb({ url, name }: { readonly url: string | undefined; readonly name: string }): ReactNode {
  const palette = useColors();
  return url ? <Image source={{ uri: url }} accessibilityLabel={name} style={{ width: THUMB, height: THUMB, borderRadius: radius.md }} resizeMode="cover" accessibilityIgnoresInvertColors />
    : <View style={{ width: THUMB, height: THUMB, borderRadius: radius.md, backgroundColor: palette.surfaceMuted }} />;
}

/**
 * One drop zone and one button for a kind of photo (gallery or logo). Files go one after the other (register, PUT, complete, wait until
 * READY); a refused file never reaches the server. A drop follows the same rules as the button. A picture dragged from another page
 * (an address, not a file) is not taken: the person is told to save the file and upload it.
 */
function UploadZone({ providerId, purpose, room, onReady }: { readonly providerId: string; readonly purpose: ProviderMediaPurpose; readonly room: number; readonly onReady: (photo: ProviderMedia) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const client = useApiClient();
  const upload = useUploadProviderMedia(client, providerId);
  const [stage, setStage] = useState<PhotoStage | null>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const [notAFile, setNotAFile] = useState(false);
  const [drag, setDrag] = useState<DragState>("idle");
  const helpId = useId();
  const busy = upload.isPending;
  const blocked = busy || room <= 0;
  const send = async (files: readonly { readonly file: Blob; readonly type: string; readonly size: number }[]): Promise<void> => {
    setProblem(null); setNotAFile(false);
    for (const item of files.slice(0, Math.max(room, 0))) {
      const refused = photoInputProblem({ type: item.type, size: item.size });
      if (refused) { setProblem(new PhotoInputError(refused)); continue; }
      try {
        const photo = await upload.mutateAsync({ file: item.file, contentType: item.type, purpose, idempotencyKey: newIdempotencyKey(), onStage: setStage });
        if (photo?.status === "READY") onReady(photo);
        else if (photo?.status === "REJECTED") setProblem(new Error(photo.rejectReason ?? "REJECTED"));
      } catch (error) { setProblem(error); }
      finally { setStage(null); }
    }
  };
  const choose = async (): Promise<void> => {
    let picked: Awaited<ReturnType<typeof pickImage>>;
    try { picked = await pickImage({ throwOnDenied: true }); } catch (error) { setProblem(error); return; }
    if (picked) await send([{ file: picked.file, type: picked.type, size: picked.file.size }]);
  };
  const shown: DragState = blocked ? "idle" : drag;
  const hint = shown === "valid" ? t("host.media.dropNow") : shown === "invalid" ? t("host.media.dropInvalid") : t(`portal.microsite.photos.${purpose}.drop`);
  const border = shown === "valid" ? palette.primary : shown === "invalid" ? palette.danger : palette.fieldBorder;
  const droppable = supportsFileDrop() && room > 0;
  return (
    <View style={{ gap: spacing[2] }}>
      <FileDropArea label={t(`portal.microsite.photos.${purpose}.zone`)} describedBy={droppable ? helpId : undefined} multiple={purpose === "GALLERY"} accept={PHOTO_TYPES} disabled={blocked}
        onFiles={(files) => { if (!blocked) void send(toPickedDrop(files)); }} onNoFiles={() => { if (!blocked) { setProblem(null); setNotAFile(true); } }} onDragState={setDrag} testID={`microsite-${purpose}-zone`}
        style={droppable ? { gap: spacing[3], padding: spacing[5], alignItems: "center", borderWidth: 2, borderStyle: "dashed", borderRadius: radius.lg, borderColor: border, backgroundColor: shown === "idle" ? "transparent" : palette.primaryMuted } : { alignItems: "flex-start" }}>
        {droppable ? <Text nativeID={helpId} aria-live="polite" style={[styles.body, { textAlign: "center", fontWeight: "600" }]}>{hint}</Text> : null}
        <ActionButton variant="secondary" icon="upload" label={t(`portal.microsite.photos.${purpose}.add`)} busy={busy} disabled={blocked} onPress={() => { void choose(); }} testID={`microsite-${purpose}-add`} />
      </FileDropArea>
      {room <= 0 ? <Text style={styles.muted}>{t(`portal.microsite.photos.${purpose}.full`)}</Text> : null}
      {notAFile ? <Notice kind="error">{t("host.media.pickProblems.notAFile")}</Notice> : null}
      <Text accessibilityLiveRegion="polite" role="status" style={styles.muted}>{stage ? t(`portal.product.photos.stage.${stage}`) : ""}</Text>
      <SheetErrorNotice error={problem} />
    </View>
  );
}

/**
 * «Fotos y logo» of the public profile (provider-catalog 3.13.0): upload from the device, never a link. Photos that finish processing join the draft
 * of the profile at once and reach the public page when the profile is saved (and approved). A photo the SAVED profile still shows cannot be
 * deleted: remove it from the profile, save, then delete the file.
 */
/**
 * `onChange` takes an UPDATER, never a finished value: several files dropped together finish one after the other, each from a render that
 * does not yet hold the one before, so every change must start from the latest draft (a finished value would keep only the last photo).
 */
export function MicrositePhotos({ providerId, pictures, onChange }: { readonly providerId: string; readonly pictures: Pictures; readonly onChange: (update: (current: Pictures) => Pictures) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const client = useApiClient();
  const media = useProviderMedia(client, providerId);
  const remove = useDeleteProviderMedia(client, providerId);
  const items = media.data ?? [];
  const inProfile = new Set([...pictures.gallery.map((entry) => entry.mediaId), ...(pictures.logo ? [pictures.logo.mediaId] : [])]);
  const unused = items.filter((item) => item.status === "READY" && !inProfile.has(item.id));
  const pending = items.filter((item) => item.status !== "READY" && item.status !== "DELETING");
  const galleryRoom = MAX_GALLERY_PHOTOS - pictures.gallery.length;
  const logoCount = activeMedia(items, "LOGO").length;
  const locale = useLocale();
  const addToGallery = (photo: ProviderMedia): void => onChange((current) => (current.gallery.length >= MAX_GALLERY_PHOTOS || current.gallery.some((entry) => entry.mediaId === photo.id) ? current
    : { ...current, gallery: [...current.gallery, { mediaId: photo.id, url: cardOf(photo), ...(photo.altText ? { alt: { [locale]: photo.altText } } : {}) }] }));
  const useAsLogo = (photo: ProviderMedia): void => onChange((current) => ({ ...current, logo: { mediaId: photo.id, url: cardOf(photo) } }));
  const describe = (mediaId: string, text: string): void => onChange((current) => ({ ...current, gallery: current.gallery.map((entry) => {
    if (entry.mediaId !== mediaId) return entry;
    const { alt: _before, ...rest } = entry;
    return text.trim() ? { ...rest, alt: { ...(_before ?? {}), [locale]: text } } : { ...rest, ...(Object.keys(_before ?? {}).filter((key) => key !== locale).length ? { alt: Object.fromEntries(Object.entries(_before ?? {}).filter(([key]) => key !== locale)) } : {}) };
  }) }));
  const urlOf = (id: string): string | undefined => items.find((item) => item.id === id)?.renditions?.card.url;

  return (
    <View style={{ gap: spacing[4] }} testID="microsite-photos">
      <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.microsite.photos.title")}</Text>
      <Text style={styles.muted}>{t("portal.microsite.photos.intro")}</Text>

      <Text style={styles.label}>{t("portal.microsite.photos.LOGO.title")}</Text>
      {pictures.logo ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }} testID="microsite-logo">
          <Thumb url={pictures.logo.url} name={t("portal.microsite.photos.LOGO.title")} />
          <ActionButton variant="secondary" icon="trash" label={t("portal.microsite.photos.LOGO.remove")} onPress={() => onChange((current) => ({ ...current, logo: null }))} testID="microsite-logo-remove" />
        </View>
      ) : <Text style={styles.muted}>{t("portal.microsite.photos.LOGO.none")}</Text>}
      <UploadZone providerId={providerId} purpose="LOGO" room={MAX_LOGOS - logoCount} onReady={useAsLogo} />

      <Text style={styles.label}>{t("portal.microsite.photos.GALLERY.title")}</Text>
      <Text style={styles.muted} testID="microsite-gallery-count">{t("portal.microsite.photos.GALLERY.count", { count: pictures.gallery.length, max: MAX_GALLERY_PHOTOS })}</Text>
      {pictures.gallery.length ? (
        <View role="list" aria-label={t("portal.microsite.photos.GALLERY.title")}>
          {pictures.gallery.map((entry, index) => (
            <View key={entry.mediaId} role="listitem" style={{ gap: spacing[2], paddingVertical: spacing[2], borderTopWidth: index === 0 ? 0 : 1, borderTopColor: palette.border }} testID={`microsite-photo-${entry.mediaId}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
                <Thumb url={urlOf(entry.mediaId) ?? entry.url} name={entry.alt?.[locale] || t("portal.product.photos.photo", { n: index + 1 })} />
                <Text style={[styles.body, { flex: 1 }]}>{t("portal.product.photos.photo", { n: index + 1 })}</Text>
                <ActionButton variant="secondary" icon="trash" label={t("portal.microsite.photos.GALLERY.remove", { n: index + 1 })} onPress={() => onChange((current) => ({ ...current, gallery: current.gallery.filter((other) => other.mediaId !== entry.mediaId) }))} testID={`microsite-photo-remove-${entry.mediaId}`} />
              </View>
              <Field label={t("portal.microsite.photos.GALLERY.alt", { n: index + 1 })} help={t("portal.microsite.photos.GALLERY.altHelp")} value={entry.alt?.[locale] ?? ""} onChange={(text) => describe(entry.mediaId, text)} maxLength={200} testID={`microsite-photo-alt-${entry.mediaId}`} />
            </View>
          ))}
        </View>
      ) : <Text style={styles.muted}>{t("portal.microsite.photos.GALLERY.none")}</Text>}
      <UploadZone providerId={providerId} purpose="GALLERY" room={galleryRoom} onReady={addToGallery} />

      {pending.length ? <Text style={styles.muted} accessibilityLiveRegion="polite" testID="microsite-media-pending">{t("portal.microsite.photos.pending", { count: pending.length })}</Text> : null}
      {unused.length ? (
        <View style={{ gap: spacing[2] }} testID="microsite-media-unused">
          <Text style={styles.label}>{t("portal.microsite.photos.unused")}</Text>
          {unused.map((photo, index) => (
            <View key={photo.id} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[3] }}>
              <Thumb url={photo.renditions?.thumb.url} name={t("portal.product.photos.photo", { n: index + 1 })} />
              {photo.purpose === "GALLERY"
                ? <ActionButton variant="secondary" icon="plus" label={t("portal.microsite.photos.GALLERY.use")} disabled={galleryRoom <= 0} onPress={() => addToGallery(photo)} />
                : <ActionButton variant="secondary" icon="plus" label={t("portal.microsite.photos.LOGO.use")} onPress={() => useAsLogo(photo)} />}
              <ActionButton variant="secondary" icon="trash" label={t("portal.microsite.photos.delete")} busy={remove.isPending && remove.variables === photo.id} disabled={remove.isPending} onPress={() => remove.mutate(photo.id)} testID={`microsite-media-delete-${photo.id}`} />
            </View>
          ))}
        </View>
      ) : null}
      <SheetErrorNotice error={remove.error} />
      {media.isError ? <Notice kind="error">{t("portal.microsite.photos.loadFailed")}</Notice> : null}
    </View>
  );
}
