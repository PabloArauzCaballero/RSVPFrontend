import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { LanguageSwitch, authStyles } from "./auth-ui";

/**
 * Landing of the personal invitation link (`https://<domain>/rsvp/<token>` or `rsvp://rsvp/<token>`),
 * public: guests arrive by magic link, not by account (REQ-F05-04/05). Resolving the token into an
 * invitation needs the Guest service, which is not built yet, so this screen says so honestly.
 */
export function InvitationLinkScreen({ token }: { readonly token: string | undefined }): ReactNode {
  const t = useT();
  const valid = Boolean(token?.trim());
  return (
    <View style={authStyles.centered}>
      <View style={{ width: "100%", maxWidth: 440, gap: spacing[4] }}>
        <Text accessibilityRole="header" aria-level={1} style={authStyles.title}>{valid ? t("invitation.appTitle") : t("invitation.invalidTitle")}</Text>
        <Text style={authStyles.intro}>{valid ? t("invitation.appBody") : t("invitation.invalidBody")}</Text>
        <LanguageSwitch />
      </View>
    </View>
  );
}
