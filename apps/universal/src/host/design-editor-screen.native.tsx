import type { ReactNode } from "react";
import { View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { Notice } from "./ui";
import type { ScreenProps } from "./gate";

/** iOS and Android: the editor is web-first (P10). The app shows the published invitation; designing happens in the browser. */
export function DesignEditorScreen(_props: ScreenProps): ReactNode {
  const t = useT();
  return <View style={{ padding: spacing[6] }}><Notice>{t("designEditor.nativeOnly")}</Notice></View>;
}
