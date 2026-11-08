import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { readLocal, writeLocal } from "../platform/local-store";
import { MomentBackdrop, Button, SkeletonList, useColors, type MomentBackdropProps } from "@rsvp/ui";

/** Shared pieces of the provider portal and the admin screens: nothing here carries copy except the loading label. */

/** Loading placeholder with the shape of the real row, so the list lands where the skeleton was (no layout shift). */
export function RowsSkeleton({ count = 4, minHeight = 76, avatar = false, trailing = true }: { readonly count?: number; readonly minHeight?: number; readonly avatar?: boolean; readonly trailing?: boolean }): ReactNode {
  const t = useT();
  return <SkeletonList count={count} row={{ minHeight, avatar, trailing, lines: 2 }} label={t("host.common.loading")} />;
}

/** A milestone sits on the still backdrop of the brand (the check is the only thing that moves). */
export function Moment({ variant, children }: PropsWithChildren<{ readonly variant: MomentBackdropProps["variant"] }>): ReactNode {
  const { width } = useWindowDimensions();
  const palette = useColors();
  // The art needs room around the text: under 720 px the check and the words stand alone so nothing crosses the lines.
  return (
    <View style={{ position: "relative", overflow: "hidden", borderRadius: radius.xl, maxWidth: 720, width: "100%", ...(width >= 720 ? { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border } : null) }}>
      {width >= 720 ? <MomentBackdrop variant={variant} /> : null}
      {children}
    </View>
  );
}

/** True once per device for `key` (a milestone is celebrated the first time it is seen, not on every visit). Starts false so nothing flashes. */
export function useFirstTime(key: string, wanted: boolean): boolean {
  const [first, setFirst] = useState(false);
  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    void readLocal(key).then((seen) => { if (!seen && alive) { setFirst(true); void writeLocal(key, "1"); } });
    return () => { alive = false; };
  }, [key, wanted]);
  return first;
}

/**
 * The primary action of a long form: on the web it sticks to the bottom of the scroll area so the thumb always reaches it and the
 * error stays next to the button (native keeps it in the flow, the keyboard already pushes the screen). `ground` is the colour behind it.
 */
export function StickyActions({ ground = "canvas", children }: PropsWithChildren<{ readonly ground?: "canvas" | "surface" }>): ReactNode {
  const palette = useColors();
  const sticky = Platform.OS === "web" ? ({ position: "sticky", bottom: 0, zIndex: 2, borderTopWidth: 1, borderTopColor: palette.border } as object) : null;
  return <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2], paddingVertical: spacing[3], backgroundColor: palette[ground] }, sticky]}>{children}</View>;
}

/** "More options": a quiet text button, so the primary action stays the only filled one on the screen. */
export function MoreToggle({ label, onPress, testID }: { readonly label: string; readonly onPress: () => void; readonly testID: string }): ReactNode {
  return <View style={{ alignSelf: "flex-start" }}><Button variant="ghost" accessibilityLabel={label} onPress={onPress} testID={testID} state="default">{label}</Button></View>;
}
