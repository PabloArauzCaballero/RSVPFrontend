import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { personalLinkPath } from "@rsvp/auth";
import { spacing } from "@rsvp/design-tokens";
import { useResolveGuestCredential } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { LanguageSwitch, authStyles } from "./auth-ui";
import { ActionButton } from "../host/ui";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Landing of the personal invitation link (`https://<domain>/rsvp/<token>` or `rsvp://rsvp/<token>`), public: guests arrive
 * by magic link, not by account (REQ-F05-04/05). The credential alone is enough: POST /rsvp/resolve (guest-rsvp 1.10.0) says which
 * celebration it belongs to and the screen moves to `/c/{slug}/rsvp/{token}`; no `?c=` slug is needed.
 */
export function InvitationLinkScreen({ token, onResolved }: { readonly token: string | undefined; readonly onResolved?: (path: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const trimmed = token?.trim() ?? "";
  const resolved = useResolveGuestCredential(client, trimmed);
  const slug = resolved.data?.slug ?? null;
  useEffect(() => { if (slug && SLUG.test(slug) && onResolved) onResolved(personalLinkPath(slug, trimmed)); }, [slug, trimmed, onResolved]);
  const status = resolved.error instanceof ApiError ? resolved.error.status : resolved.isError ? 0 : null;
  const invalid = !trimmed || status === 401 || status === 404;
  return (
    <View style={authStyles.centered}>
      <View style={{ width: "100%", maxWidth: 440, gap: spacing[4] }}>
        <Text accessibilityRole="header" aria-level={1} style={authStyles.title}>{invalid ? t("invitation.invalidTitle") : t("invitation.appTitle")}</Text>
        {invalid ? <Text style={authStyles.intro}>{t("invitation.invalidBody")}</Text> : null}
        {!invalid && resolved.isPending ? <ActivityIndicator accessibilityLabel={t("rsvp.loading")} /> : null}
        {!invalid && status === 0 ? <><Text accessibilityRole="alert" style={authStyles.intro}>{t("rsvp.errors.offline")}</Text><ActionButton label={t("rsvp.actions.retry")} onPress={() => { void resolved.refetch(); }} /></> : null}
        {!invalid && resolved.isSuccess && !slug ? <Text style={authStyles.intro}>{t("invitation.appBody")}</Text> : null}
        <LanguageSwitch />
      </View>
    </View>
  );
}
