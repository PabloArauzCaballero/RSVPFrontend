import type { PropsWithChildren, ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing, typography } from "@rsvp/design-tokens";
import { Enter, Illustration, fonts, useColors, type IllustrationName } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { ActionButton } from "../host/ui";
import { GuestFrame, type GuestFrameProps } from "./frame";

/**
 * The gentle dead ends of the guest journey (link expired, no connection, closed answers): an illustration, what
 * happened without blaming anyone, and the one thing to do next. Shared by the invitation, the answer and the gift list.
 */

const fontFamily = fonts.sans;

export function LinkState({ illustration, title, body, action, frame, children }: PropsWithChildren<{ readonly illustration: IllustrationName; readonly title: string; readonly body?: string; readonly action?: string; /** Keeps the invitation on the cover; the state title then drops to level 2. */ readonly frame?: GuestFrameProps }>): ReactNode {
  const palette = useColors();
  return (
    <GuestFrame {...(frame ?? {})}>
      <Enter from="down"><View style={{ alignItems: "center", gap: spacing[4] }}>
        <Illustration name={illustration} tone="auto" size="md" />
        <Text accessibilityRole="header" aria-level={frame?.heading ? 2 : 1} style={{ color: palette.text, fontSize: 32, lineHeight: 35, fontWeight: "500", letterSpacing: -0.9, textAlign: "center", fontFamily: fonts.display }}>{title}</Text>
        {body ? <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, textAlign: "center", fontFamily }}>{body}</Text> : null}
        {action ? <Text style={{ color: palette.text, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, fontWeight: "600", textAlign: "center", fontFamily }}>{action}</Text> : null}
        {children}
      </View></Enter>
    </GuestFrame>
  );
}

/** Expired, revoked, incomplete or unknown link: one screen, no celebration data. */
export function InvalidLink(): ReactNode {
  const t = useT();
  return <LinkState illustration="linkExpired" title={t("rsvp.invite.invalidTitle")} body={t("rsvp.invite.invalidBody")} action={t("rsvp.invite.invalidAction")} />;
}

export function OfflineState({ onRetry, unavailable = false }: { readonly onRetry: () => void; readonly unavailable?: boolean }): ReactNode {
  const t = useT();
  return (
    <LinkState illustration="offline" title={unavailable ? t("rsvp.invite.unavailableTitle") : t("rsvp.invite.offlineTitle")} body={unavailable ? t("rsvp.invite.unavailableBody") : t("rsvp.invite.offlineBody")}>
      <ActionButton icon="refresh" label={t("rsvp.invite.retry")} onPress={onRetry} testID="guest-retry" />
    </LinkState>
  );
}
