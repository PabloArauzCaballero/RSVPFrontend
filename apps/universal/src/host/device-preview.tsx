import { useState, type ReactNode } from "react";
import { Linking, ScrollView, View } from "react-native";
import { themeFromTemplate } from "@rsvp/celebration-theme";
import { CelebrationNativeRenderer } from "@rsvp/celebration-theme/native";
import { useMediaAssets, useTemplate, type MediaAsset } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { CelebrationErrorNotice } from "./celebration-errors";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { previewView } from "./preview-model";
import { asTemplateDocument } from "./template-gallery";
import { ActionButton, ChoiceGroup, Notice, styles } from "./ui";

/** C15 · The real site at phone, tablet and desktop width, without leaving the dashboard. */

export const DEVICE_WIDTHS = { mobile: 360, tablet: 768, desktop: 1280 } as const;
type Device = keyof typeof DEVICE_WIDTHS;
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
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="preview" title={t("host.preview.title")}>
      {({ celebration, eventType }) => <Preview celebration={celebration} eventType={eventType} device={device} setDevice={setDevice} gallery={media.data?.items ?? []} locale={locale} />}
    </CelebrationScreen>
  );
}

function Preview({ celebration, eventType, device, setDevice, gallery, locale }: { readonly celebration: Parameters<typeof previewView>[0]; readonly eventType: Parameters<typeof previewView>[1]; readonly device: Device; readonly setDevice: (device: Device) => void; readonly gallery: readonly MediaAsset[]; readonly locale: string }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const template = useTemplate(client, celebration.templateId);
  const theme = themeFromTemplate(template.data ? asTemplateDocument(template.data) : null, eventType?.enabledSections ?? []);
  const images = gallery.filter((asset) => asset.status === "PROCESSED").map((asset) => ({ id: asset.id, width: asset.width, height: asset.height, isCover: asset.isCover, variants: asset.variants }));
  return (
    <View style={{ gap: 16 }}>
      <ChoiceGroup label={t("host.preview.device")} value={device} onChange={setDevice} choices={(Object.keys(DEVICE_WIDTHS) as Device[]).map((value) => ({ value, label: `${t(`host.preview.devices.${value}`)} · ${DEVICE_WIDTHS[value]} px` }))} />
      {template.isError ? <><CelebrationErrorNotice error={template.error} /><Notice>{t("host.preview.templateFallback")}</Notice><ActionButton variant="secondary" label={t("host.common.retry")} onPress={() => { void template.refetch(); }} testID="retry-template" /></> : null}
      {celebration.status === "PUBLISHED"
        ? <ActionButton variant="secondary" label={t("host.preview.openPublic")} onPress={() => { void Linking.openURL(publicUrl(celebration.slug)); }} />
        : <Notice>{t("host.preview.notPublished")}</Notice>}
      <ScrollView horizontal contentContainerStyle={{ paddingBottom: 8 }}>
        <View testID={`preview-${device}`} style={[styles.card, { width: DEVICE_WIDTHS[device], padding: 0, overflow: "hidden" }]}>
          <CelebrationNativeRenderer theme={theme} view={previewView(celebration, eventType, locale)} gallery={images} t={t} />
        </View>
      </ScrollView>
    </View>
  );
}
