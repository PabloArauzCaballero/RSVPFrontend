import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { View } from "react-native";
import { radius } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { readLocal, writeLocal } from "../platform/local-store";
import { Button, SkeletonList, useColors } from "@rsvp/ui";

/** Shared pieces of the provider portal and the admin screens: nothing here carries copy except the loading label. */

/** Loading placeholder with the shape of the real row, so the list lands where the skeleton was (no layout shift). */
export function RowsSkeleton({ count = 4, minHeight = 76, avatar = false, trailing = true }: { readonly count?: number; readonly minHeight?: number; readonly avatar?: boolean; readonly trailing?: boolean }): ReactNode {
  const t = useT();
  return <SkeletonList count={count} row={{ minHeight, avatar, trailing, lines: 2 }} label={t("host.common.loading")} />;
}

/** A milestone sits on a plain card with a 1 px edge (the drawn check is the only thing that moves). */
export function Moment({ children }: PropsWithChildren): ReactNode {
  const palette = useColors();
  return <View style={{ borderRadius: radius.lg, width: "100%", backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }}>{children}</View>;
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

/** "More options": a quiet text button, so the primary action stays the only filled one on the screen. */
export function MoreToggle({ label, onPress, testID }: { readonly label: string; readonly onPress: () => void; readonly testID: string }): ReactNode {
  return <View style={{ alignSelf: "flex-start" }}><Button variant="ghost" accessibilityLabel={label} onPress={onPress} testID={testID} state="default">{label}</Button></View>;
}
