import { useCallback, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CelebrationTheme, GalleryImage, PreviewPayload, PublicCelebrationView } from "@rsvp/celebration-theme/model";
import { spacing } from "@rsvp/design-tokens";
import { Skeleton, useColors } from "@rsvp/ui";
import type { FramePhase } from "../platform/site-frame-types";
import { SiteFrame } from "../platform/site-frame";
import { useT } from "../platform/providers";
import { publicSiteOrigin } from "../platform/site-origin";
import { ActionButton, useStyles } from "./ui";

/**
 * P10 · The invitation the host (or the admin) is editing, drawn by the public site's own renderer inside a web view: the app
 * hands the look, the content and the photos to the site's preview page, so the preview and the published page cannot differ.
 * Loading shows a skeleton; no connection (or the site down) shows what happened and a retry, never a blank frame.
 */
export function InvitationPreview({ theme, view, gallery = [], title, testID }: { readonly theme: CelebrationTheme; readonly view: PublicCelebrationView; readonly gallery?: readonly GalleryImage[]; readonly title: string; readonly testID?: string }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const origin = publicSiteOrigin();
  // The editors rebuild the theme on every keystroke; the page only needs to hear when something actually changed.
  const serialized = JSON.stringify({ theme, view, gallery });
  const latest = useRef<{ readonly key: string; readonly payload: PreviewPayload } | null>(null);
  if (latest.current?.key !== serialized) latest.current = { key: serialized, payload: { theme, view, gallery } };
  const payload = latest.current.payload;
  const [phase, setPhase] = useState<FramePhase>("loading");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setPhase("loading"); setAttempt((value) => value + 1); }, []);
  const failed = phase === "offline" || phase === "unavailable" || phase === "notFound";
  if (failed) {
    return (
      <View role="alert" style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[3], padding: spacing[4], backgroundColor: palette.canvas }} testID="preview-error">
        <Text style={styles.body}>{t("celebration.app.previewError")}</Text>
        <ActionButton icon="refresh" variant="secondary" label={t("celebration.app.previewRetry")} onPress={retry} testID="preview-retry" />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <SiteFrame key={attempt} mode="preview" origin={origin} payload={payload} title={title} testID={testID ?? "preview-frame"} onPhase={setPhase} />
      {phase === "loading" ? (
        <View role="status" aria-busy accessibilityLabel={t("celebration.app.previewLoading")} style={[StyleSheet.absoluteFill, { backgroundColor: palette.canvas, padding: spacing[4], gap: spacing[3] }]} testID="preview-loading">
          <Skeleton width="60%" height={28} /><Skeleton width="100%" height={14} /><Skeleton width="90%" height={14} />
        </View>
      ) : null}
    </View>
  );
}
