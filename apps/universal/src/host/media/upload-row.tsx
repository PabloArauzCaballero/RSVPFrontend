import { useEffect, useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import type { QueueItem, UploadFailure } from "@rsvp/query-hooks";
import { Button, useColors } from "@rsvp/ui";
import { useT } from "../../platform/providers";
import { Notice, useStyles } from "../ui";

const PERCENT = 100;
const PREVIEW = 56;
const FAILURE_KEY: Readonly<Record<UploadFailure, string>> = {
  type: "type", tooLarge: "tooLarge", quotaAssets: "quotaAssets", quotaBytes: "quotaBytes", rights: "rights", invalid: "invalid", tooLong: "tooLong", rejected: "rejected", forbidden: "forbidden", network: "network", server: "server"
};

export function Bar({ now, max, label }: { readonly now: number; readonly max: number; readonly label: string }): ReactNode {
  const palette = useColors();
  const percent = Math.min(PERCENT, Math.round((now / max) * PERCENT));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(now, max)} style={{ height: 8, borderRadius: 4, borderWidth: 1, borderColor: palette.fieldBorder, overflow: "hidden", backgroundColor: palette.primaryMuted }}>
      <View style={{ width: `${percent}%`, height: 6, backgroundColor: palette.primary }} />
    </View>
  );
}

/** The address to draw a file from: the picker's on a phone, a temporary one made from the Blob on the web (released with the row). */
function usePreviewUri({ file, previewUri, type }: QueueItem): string | null {
  const [made, setMade] = useState<string | null>(null);
  const image = type.startsWith("image/");
  useEffect(() => {
    if (!image || previewUri || typeof document === "undefined" || typeof URL.createObjectURL !== "function") return undefined;
    const url = URL.createObjectURL(file);
    setMade(url);
    return () => URL.revokeObjectURL(url);
  }, [file, previewUri, image]);
  return image ? previewUri ?? made : null;
}

/** Decorative: the row's text already names the file. What cannot be drawn (an MP3, HEIC outside Safari) shows its extension. */
function Preview({ item }: { readonly item: QueueItem }): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  const uri = usePreviewUri(item);
  const [broken, setBroken] = useState(false);
  const extension = item.name.includes(".") ? item.name.split(".").pop()?.slice(0, 4).toUpperCase() : "";
  return (
    <View aria-hidden testID={`media-preview-${item.id}`} style={{ width: PREVIEW, height: PREVIEW, borderRadius: radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: palette.primaryMuted }}>
      {uri && !broken ? <Image source={{ uri }} onError={() => setBroken(true)} style={{ width: PREVIEW, height: PREVIEW }} resizeMode="cover" accessibilityIgnoresInvertColors /> : <Text style={styles.label}>{extension}</Text>}
    </View>
  );
}

export function UploadRow({ item, onRetry, onRemove }: { readonly item: QueueItem; readonly onRetry: () => void; readonly onRemove: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const percent = Math.round(item.progress * PERCENT);
  const text = item.status === "error" && item.failure ? t(`host.media.failures.${FAILURE_KEY[item.failure]}`, { name: item.name })
    : item.status === "uploading" ? t("host.media.uploading", { name: item.name, percent })
    : item.status === "processing" ? t("host.media.processing", { name: item.name })
    : item.status === "done" ? t("host.media.done", { name: item.name }) : `${item.name} · ${t("host.media.queued")}`;
  const removable = item.status !== "uploading";
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing[3] }} testID={`media-row-${item.id}`}>
      <Preview item={item} />
      <View style={{ flex: 1, minWidth: 0, gap: spacing[2] }}>
        {item.status === "error" ? <Notice kind="error">{text}</Notice> : <Text style={styles.body} accessibilityLiveRegion="polite" aria-live="polite">{text}</Text>}
        {/* The live region above only changes with the STATE of the file; the progress travels in the bar's value, so a screen reader asks for it instead of hearing every tick. */}
        {item.status === "uploading" ? <><Bar now={percent} max={PERCENT} label={t("host.media.progressLabel", { name: item.name })} /><Text style={styles.body}>{percent} %</Text></> : null}
        <View style={{ flexDirection: "row", gap: spacing[3], flexWrap: "wrap" }}>
          {item.status === "error" && item.retryable ? <Button variant="secondary" icon="refresh" accessibilityLabel={t("host.media.retryNamed", { name: item.name })} onPress={onRetry} testID={`media-retry-${item.id}`}>{t("host.media.retry")}</Button> : null}
          {removable && item.status !== "done" ? <Button variant="secondary" icon="close" accessibilityLabel={t("host.media.removeNamed", { name: item.name })} onPress={onRemove} testID={`media-remove-${item.id}`}>{t("host.media.remove")}</Button> : null}
        </View>
      </View>
    </View>
  );
}
