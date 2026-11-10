import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { personalLinkPath } from "@rsvp/auth";
import { ApiError } from "@rsvp/api-client";
import { useResolveGuestCredential } from "@rsvp/query-hooks";
import { LanguageSwitch } from "../auth/auth-ui";
import { ActionButton, Notice, styles } from "../host/ui";
import { useApiClient, useT } from "../platform/providers";
import { guestGiftsPath, validGuestSlug, validGuestToken } from "../deep-links/router";
import { GuestDataBoundary } from "./data-boundary";
import { InvalidGuestLink } from "./invalid-link";

interface Props {
  readonly token: string;
  readonly surface?: "rsvp" | "gifts";
  readonly onResolved: (path: string) => void;
}

export function GuestLinkLanding(props: Props): ReactNode {
  if (!validGuestToken(props.token)) return <InvalidGuestLink />;
  return <GuestDataBoundary key={`${props.surface}:${props.token}`}><LandingBody {...props} /></GuestDataBoundary>;
}

function LandingBody({ token, surface = "rsvp", onResolved }: Props): ReactNode {
  const t = useT();
  const client = useApiClient();
  const query = useResolveGuestCredential(client, token);
  const slug = query.data?.slug;
  const destination = slug && validGuestSlug(slug) ? surface === "gifts" ? guestGiftsPath(slug, token) : personalLinkPath(slug, token) : null;
  useEffect(() => { if (destination) onResolved(destination); }, [destination, onResolved]);
  const status = query.error instanceof ApiError ? query.error.status : null;
  if (status === 401 || status === 404 || (query.isSuccess && !destination)) return <InvalidGuestLink />;
  return <ScrollView role="main" style={styles.page} contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" aria-level={1} style={styles.title}>{t("rsvp.app.title")}</Text>
    {query.isError ? <Notice kind="error">
      <Text style={styles.body}>{status === 403 ? t("guestApp.permission") : status === 429 ? t("rsvp.errors.rateLimitedNoWait") : t("rsvp.errors.unavailable")}</Text>
      <ActionButton label={t("rsvp.actions.retry")} onPress={() => { void query.refetch(); }} />
    </Notice> : <View accessibilityLiveRegion="polite"><ActivityIndicator accessibilityLabel={t("rsvp.loading")} /><Text style={styles.body}>{t("rsvp.loading")}</Text></View>}
    <LanguageSwitch />
  </ScrollView>;
}
