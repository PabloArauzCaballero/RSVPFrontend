import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { themeFromTemplate } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { useMediaAssets, useTemplate, type Celebration, type MediaAsset, type TranslatedEventType } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { previewView } from "./preview-model";
import { PreviewStage, DEVICE_WIDTHS, type Device } from "./preview-stage";
import { asTemplateDocument } from "./template-gallery";
import { HOST_ROUTES, withCelebration } from "./routes";
import { ActionButton, Notice, styles } from "./ui";

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
  const client = useApiClient();
  const template = useTemplate(client, celebration.templateId);
  const theme = themeFromTemplate(template.data ? asTemplateDocument(template.data) : null, eventType?.enabledSections ?? []);
  const images = gallery.filter((asset) => asset.status === "PROCESSED").map((asset) => ({ id: asset.id, width: asset.width, height: asset.height, isCover: asset.isCover, variants: asset.variants }));
  return (
    <View style={{ gap: spacing[4] }}>
      {template.isError ? <Notice><Text style={styles.body}>{t("host.preview.templateFallback")}</Text><ActionButton variant="secondary" label={t("host.common.retry")} onPress={() => { void template.refetch(); }} testID="retry-template" /></Notice> : null}
      <View style={styles.row}>
        <ActionButton variant="secondary" label={t("host.preview.changeStyle")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.templates, celebration.id))} />
        {celebration.status === "PUBLISHED" ? <ActionButton variant="secondary" label={t("host.preview.openPublic")} onPress={() => { void Linking.openURL(publicUrl(celebration.slug)); }} /> : null}
      </View>
      {celebration.status === "PUBLISHED" ? null : <Notice>{t("host.preview.notPublished")}</Notice>}
      <PreviewStage theme={theme} view={previewView(celebration, eventType, locale)} gallery={images} label={t("host.preview.frame")} device={device} onDevice={setDevice} />
    </View>
  );
}
