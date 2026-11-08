import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { livePalette } from "../platform/theme";

/**
 * Progressive disclosure («Más opciones»): what most people never touch stays closed until they ask for it.
 * A 44 px button with a drawn chevron (never a glyph) and `aria-expanded`; the content is not mounted while closed,
 * so a collapsed block costs no requests and no tab stops.
 */

const palette = livePalette;
const MIN_TOUCH = 44;
const CHEVRON = 8;
const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
const focusRing = (): object => Platform.select({ web: { outlineColor: palette.primary, outlineWidth: 2, outlineOffset: 2 }, default: {} }) as object;

export function MoreOptions({ label, testID, defaultOpen = false, open: controlled, onOpenChange, children }: PropsWithChildren<{ readonly label: string; readonly testID: string; readonly defaultOpen?: boolean; /** Controlled mode, for a parent that remounts its content (a form keyed by version) and must not collapse it. */ readonly open?: boolean; readonly onOpenChange?: (open: boolean) => void }>): ReactNode {
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const setOpen = (update: (current: boolean) => boolean): void => { const next = update(open); setInner(next); onOpenChange?.(next); };
  return (
    <View style={{ gap: spacing[3] }}>
      <Pressable testID={testID} role="button" aria-expanded={open} accessibilityLabel={label} onPress={() => setOpen((current) => !current)}
        style={[{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing[2], alignSelf: "flex-start", paddingHorizontal: spacing[3], borderRadius: radius.full }, focusRing()]}>
        <View style={{ width: CHEVRON, height: CHEVRON, borderRightWidth: 2, borderBottomWidth: 2, borderColor: palette.primary, transform: [{ rotate: open ? "-135deg" : "45deg" }, { translateY: open ? 2 : -2 }] }} />
        <Text style={{ color: palette.primary, fontWeight: "700", fontSize: 15, fontFamily }}>{label}</Text>
      </Pressable>
      {open ? <View style={{ gap: spacing[4] }}>{children}</View> : null}
    </View>
  );
}
