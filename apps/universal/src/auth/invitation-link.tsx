import { useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { personalLinkPath } from "@rsvp/auth";
import { Skeleton } from "@rsvp/ui";
import { useResolveGuestCredential } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { GuestFrame } from "../guest/frame";
import { InvalidLink, LinkState, OfflineState } from "../guest/link-states";
import { useStyles } from "../host/ui";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Landing of the personal invitation link (`https://<domain>/rsvp/<token>` or `rsvp://rsvp/<token>`), public: guests arrive
 * by magic link, not by account (REQ-F05-04/05). The credential alone is enough: POST /rsvp/resolve (guest-rsvp 1.10.0) says which
 * celebration it belongs to and the screen moves to `/c/{slug}/rsvp/{token}`; no `?c=` slug is needed.
 * A link that does not open says so kindly and says whom to ask for a new one.
 */
export function InvitationLinkScreen({ token, onResolved }: { readonly token: string | undefined; readonly onResolved?: (path: string) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const trimmed = token?.trim() ?? "";
  const resolved = useResolveGuestCredential(client, trimmed);
  const slug = resolved.data?.slug ?? null;
  useEffect(() => { if (slug && SLUG.test(slug) && onResolved) onResolved(personalLinkPath(slug, trimmed)); }, [slug, trimmed, onResolved]);
  const status = resolved.error instanceof ApiError ? resolved.error.status : resolved.isError ? 0 : null;
  const invalid = !trimmed || status === 401 || status === 404;
  if (invalid) return <InvalidLink />;
  if (status === 0) return <OfflineState onRetry={() => { void resolved.refetch(); }} />;
  if (resolved.isSuccess && !slug) return <LinkState illustration="welcomeGuest" title={t("invitation.appTitle")} body={t("invitation.appBody")} />;
  return <GuestFrame><View accessibilityLiveRegion="polite" style={{ gap: 12 }}><Skeleton width="60%" height={24} /><Skeleton height={16} /><Text style={styles.muted}>{t("invitation.appTitle")}</Text></View></GuestFrame>;
}
