import { useState, type ReactNode } from "react";
import { ScrollView, View, type LayoutChangeEvent } from "react-native";
import type { CelebrationTheme, GalleryImage, PublicCelebrationView } from "@rsvp/celebration-theme";
import { CelebrationNativeRenderer } from "@rsvp/celebration-theme/native";
import { radius } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { ChoiceGroup } from "./ui";
import { livePalette } from "../platform/theme";

/**
 * The invitation as guests see it, framed at a device width and scaled down to fit the space it has. Shared by the
 * guided sign-up, the content editor, the style picker and the preview tab so all of them show the same thing.
 */

export const DEVICE_WIDTHS = { mobile: 360, tablet: 768, desktop: 1280 } as const;
export type Device = keyof typeof DEVICE_WIDTHS;
const DEVICES = Object.keys(DEVICE_WIDTHS) as Device[];
const FRAME_HEIGHT: Readonly<Record<Device, number>> = { mobile: 560, tablet: 520, desktop: 480 };
const palette = livePalette;

/** How much a device-wide frame shrinks to fit `available` pixels (never grows past real size). */
export function fitScale(deviceWidth: number, available: number | null): number {
  if (!available || available <= 0) return 1;
  return Math.min(1, available / deviceWidth);
}

export function PreviewFrame({ device, theme, view, gallery = [], label, height }: { readonly device: Device; readonly theme: CelebrationTheme; readonly view: PublicCelebrationView; readonly gallery?: readonly GalleryImage[]; readonly label: string; readonly height?: number }): ReactNode {
  const t = useT();
  const [available, setAvailable] = useState<number | null>(null);
  const width = DEVICE_WIDTHS[device];
  const scale = fitScale(width, available);
  const frameHeight = height ?? FRAME_HEIGHT[device];
  const onLayout = (event: LayoutChangeEvent): void => setAvailable(event.nativeEvent.layout.width);
  return (
    <View onLayout={onLayout} style={{ width: "100%", alignItems: "center" }}>
      <View testID={`preview-${device}`} role="region" aria-label={label} style={{ width: width * scale, height: frameHeight * scale, overflow: "hidden", borderRadius: radius.xl, borderWidth: 1.5, borderColor: palette.border, backgroundColor: theme.palette.canvas }}>
        <View style={{ width, height: frameHeight, transform: [{ scale }], transformOrigin: "top left" }}>
          <ScrollView style={{ flex: 1 }} nestedScrollEnabled>
            <CelebrationNativeRenderer theme={theme} view={view} gallery={gallery} t={t} />
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

export function PreviewStage({ theme, view, gallery, label, device, onDevice, switcher = true, height }: { readonly theme: CelebrationTheme; readonly view: PublicCelebrationView; readonly gallery?: readonly GalleryImage[]; readonly label: string; readonly device?: Device; readonly onDevice?: (device: Device) => void; readonly switcher?: boolean; readonly height?: number }): ReactNode {
  const t = useT();
  const [own, setOwn] = useState<Device>("mobile");
  const current = device ?? own;
  const choose = (next: Device): void => { setOwn(next); onDevice?.(next); };
  return (
    <View style={{ gap: 12 }}>
      {switcher ? <ChoiceGroup label={t("host.preview.device")} value={current} onChange={choose} choices={DEVICES.map((value) => ({ value, label: `${t(`host.preview.devices.${value}`)} · ${DEVICE_WIDTHS[value]} px` }))} /> : null}
      <PreviewFrame device={current} theme={theme} view={view} {...(gallery ? { gallery } : {})} label={label} {...(height ? { height } : {})} />
    </View>
  );
}
