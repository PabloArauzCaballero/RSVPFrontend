import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { themeFromTemplate } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { useMediaAssets, useTemplate, type Celebration, type MediaAsset, type TranslatedEventType } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { CelebrationScreen, useScreenHeader, type ScreenProps } from "./gate";
import { previewView } from "./preview-model";
import { PreviewStage, DEVICE_WIDTHS, type Device } from "./preview-stage";
import { asTemplateDocument } from "./template-gallery";
import { HOST_ROUTES, withCelebration } from "./routes";
import { Enter } from "@rsvp/ui";
import { ActionButton, Notice, OverflowMenu, useStyles } from "./ui";

/** C15 · The real invitation at phone, tablet and desktop width, without leaving the dashboard. */

export { DEVICE_WIDTHS };
const DEFAULT_SITE_URL = "http://localhost:3000";

export function publicUrl(slug: string): string {
  return `${process.env.EXPO_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL}/c/${slug}`;
}

export function DevicePreviewScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const [device, setDevice] = useState<Device>("mobile");
  const media = useMediaAssets(client, celebrationId ?? "");
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="preview" title={t("host.preview.title")} intro={t("host.preview.intro")}>
      {({ celebration, eventType }) => <Preview celebration={celebration} eventType={eventType} device={device} setDevice={setDevice} gallery={media.data?.items ?? []} locale={locale} onNavigate={onNavigate} />}
    </CelebrationScreen>
  );
}

function Preview({ celebration, eventType, device, setDevice, gallery, locale, onNavigate }: { readonly celebration: Celebration; readonly eventType: TranslatedEventType | undefined; readonly device: Device; readonly setDevice: (device: Device) => void; readonly gallery: readonly MediaAsset[]; readonly locale: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const template = useTemplate(client, celebration.templateId);
  const theme = themeFromTemplate(template.data ? asTemplateDocument(template.data) : null, eventType?.enabledSections ?? []);
  const images = gallery.filter((asset) => asset.status === "PROCESSED").map((asset) => ({ id: asset.id, width: asset.width, height: asset.height, isCover: asset.isCover, variants: asset.variants }));
  const published = celebration.status === "PUBLISHED";
  // One action: open the public page once it exists, otherwise go and publish. Changing the style is secondary.
  useScreenHeader({
    actions: published
      ? <ActionButton label={t("host.preview.openPublic")} onPress={() => { void Linking.openURL(publicUrl(celebration.slug)); }} testID="open-public" />
      : celebration.status === "DRAFT" ? <ActionButton label={t("host.publish.publish")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.publish, celebration.id))} testID="go-publish" /> : null,
    menu: <OverflowMenu items={[{ key: "style", label: t("host.preview.changeStyle"), onPress: () => onNavigate(withCelebration(HOST_ROUTES.templates, celebration.id)) }]} />
  });
  return (
    <View style={{ gap: spacing[4] }}>
      {template.isError ? <Notice><Text style={styles.body}>{t("host.preview.templateFallback")}</Text><ActionButton variant="secondary" label={t("host.common.retry")} onPress={() => { void template.refetch(); }} testID="retry-template" /></Notice> : null}
      {celebration.status === "PUBLISHED" ? null : <Enter from="up"><Notice>{t("host.preview.notPublished")}</Notice></Enter>}
      <PreviewStage theme={theme} view={previewView(celebration, eventType, locale)} gallery={images} label={t("host.preview.frame")} device={device} onDevice={setDevice} />
    </View>
  );
}
