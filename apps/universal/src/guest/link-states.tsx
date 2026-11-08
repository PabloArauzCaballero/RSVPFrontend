import type { PropsWithChildren, ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { spacing, typography } from "@rsvp/design-tokens";
import { Illustration, type IllustrationName } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { ActionButton } from "../host/ui";
import { GuestFrame, type GuestFrameProps } from "./frame";
import { livePalette } from "../platform/theme";

/**
 * The gentle dead ends of the guest journey (link expired, no connection, closed answers): an illustration, what
 * happened without blaming anyone, and the one thing to do next. Shared by the invitation, the answer and the gift list.
 */

const palette = livePalette;
const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });

export function LinkState({ illustration, title, body, action, frame, children }: PropsWithChildren<{ readonly illustration: IllustrationName; readonly title: string; readonly body?: string; readonly action?: string; /** Keeps the invitation on the cover; the state title then drops to level 2. */ readonly frame?: GuestFrameProps }>): ReactNode {
  return (
    <GuestFrame {...(frame ?? {})}>
      <View style={{ alignItems: "center", gap: spacing[3] }}>
        <Illustration name={illustration} size="lg" />
        <Text accessibilityRole="header" aria-level={frame?.heading ? 2 : 1} style={{ color: palette.text, fontSize: 28, lineHeight: 31, fontWeight: "800", letterSpacing: -0.8, textAlign: "center", fontFamily }}>{title}</Text>
        {body ? <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, textAlign: "center", fontFamily }}>{body}</Text> : null}
        {action ? <Text style={{ color: palette.text, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, fontWeight: "700", textAlign: "center", fontFamily }}>{action}</Text> : null}
        {children}
      </View>
    </GuestFrame>
  );
}

/** Expired, revoked, incomplete or unknown link: one screen, no celebration data. */
export function InvalidLink(): ReactNode {
  const t = useT();
  return <LinkState illustration="invitation" title={t("rsvp.invite.invalidTitle")} body={t("rsvp.invite.invalidBody")} action={t("rsvp.invite.invalidAction")} />;
}

export function OfflineState({ onRetry, unavailable = false }: { readonly onRetry: () => void; readonly unavailable?: boolean }): ReactNode {
  const t = useT();
  return (
    <LinkState illustration="offline" title={unavailable ? t("rsvp.invite.unavailableTitle") : t("rsvp.invite.offlineTitle")} body={unavailable ? t("rsvp.invite.unavailableBody") : t("rsvp.invite.offlineBody")}>
      <ActionButton label={t("rsvp.invite.retry")} onPress={onRetry} testID="guest-retry" />
    </LinkState>
  );
}
