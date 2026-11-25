import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { SECTION_PATHS, sectionForPath, type SectionId } from "@rsvp/celebration-theme/model";
import { spacing } from "@rsvp/design-tokens";
import { Skeleton, useColors } from "@rsvp/ui";
import { ActionButton } from "../host/ui";
import type { FramePhase } from "../platform/site-frame-types";
import { SiteFrame } from "../platform/site-frame";
import { useLocalePreference, useT } from "../platform/providers";
import { publicSiteOrigin } from "../platform/site-origin";
import { readGiftCredential } from "./gift-credential";
import { invitationUrl } from "./invitation-web-model";
import { GUEST_COLUMN } from "./frame";
import { LinkState, OfflineState } from "./link-states";

/**
 * A1–A8 in the app: the public invitation `/c/{slug}` and each section's own page `/c/{slug}/{section}`. Since P10 the app does
 * not draw the invitation a second time: it shows the public site's own page in a web view (one implementation, full parity:
 * template, photos, media, languages, dark mode). The site answers the 404 rule (a section the template does not place or that
 * has no content is not a page) and the app turns that answer into its own «not available» screen. The guest's personal
 * credential reaches the page as data handed to the web view, never as part of an address.
 */

export interface InvitationScreenProps {
  readonly slug: string;
  /** The section's path segment (`historia`, `lugares`…); absent on the cover. */
  readonly section?: string;
  readonly onNavigate: (path: string) => void;
  /** Opens maps, a full-size photo or a partner through the redirector; the system browser by default. */
  readonly openUrl?: (url: string) => void;
}

const openExternally = (url: string): void => { void Linking.openURL(url); };

/** `/c/{slug}` or `/c/{slug}/{path}`, the same addresses the public site serves, so a shared link means the same page. */
export function invitationPath(slug: string, section: SectionId | null): string {
  const base = `/c/${encodeURIComponent(slug)}`;
  const path = section ? SECTION_PATHS[section] : undefined;
  return path ? `${base}/${path}` : base;
}

/** `/c/{slug}/rsvp`: the guest's own answer when this session holds their link, the RSVP without a link otherwise. */
export function replyPath(slug: string): string {
  return `/c/${encodeURIComponent(slug)}/rsvp`;
}

/** `/c/{slug}/regalos`: the gift list, one tap from every state of this screen (loading, offline, the page itself has its own button). */
export function giftsRoute(slug: string): string {
  return `/c/${encodeURIComponent(slug)}/regalos`;
}

function GiftsButton({ slug, onNavigate }: { readonly slug: string; readonly onNavigate: (path: string) => void }): ReactNode {
  const t = useT();
  return <ActionButton icon="gift" variant="secondary" label={t("celebration.gifts.cta")} onPress={() => onNavigate(giftsRoute(slug))} testID="invitation-gifts" />;
}

function Loading({ slug, onNavigate }: { readonly slug: string; readonly onNavigate: (path: string) => void }): ReactNode {
  const t = useT();
  const palette = useColors();
  return (
    <View role="status" accessibilityLabel={t("celebration.app.loading")} aria-busy style={[StyleSheet.absoluteFill, { backgroundColor: palette.canvas, padding: spacing[4], gap: spacing[4] }]} testID="invitation-loading">
      {/* The same column as the offline and not-found cards (`GUEST_COLUMN`): the screen does not change width between states. */}
      <View style={{ width: "100%", maxWidth: GUEST_COLUMN, alignSelf: "center", gap: spacing[4] }} testID="invitation-loading-column">
        <View style={{ alignItems: "center", gap: spacing[3], paddingVertical: spacing[8] }}>
          <Skeleton width={96} height={12} /><Skeleton width="80%" height={40} /><Skeleton width="50%" height={16} />
        </View>
        {[0, 1, 2].map((row) => <View key={row} style={{ gap: spacing[2] }}><Skeleton width="40%" height={20} /><Skeleton width="100%" height={14} /><Skeleton width="90%" height={14} /></View>)}
        <GiftsButton slug={slug} onNavigate={onNavigate} />
      </View>
    </View>
  );
}

function NotFound({ onNavigate }: { readonly onNavigate: (path: string) => void }): ReactNode {
  const t = useT();
  return (
    <LinkState illustration="notFound" title={t("celebration.notFound.title")} body={t("celebration.notFound.body")}>
      <ActionButton icon="back" variant="secondary" label={t("celebration.notFound.home")} onPress={() => onNavigate("/")} testID="invitation-home" />
    </LinkState>
  );
}

export function InvitationScreen(props: InvitationScreenProps): ReactNode {
  // A path that is not a section is not a page: answered before anything is requested.
  const only = props.section === undefined ? undefined : sectionForPath(props.section);
  if (props.section !== undefined && !only) return <NotFound onNavigate={props.onNavigate} />;
  return <Invitation {...props} {...(only ? { only } : {})} />;
}

function Invitation({ slug, only, onNavigate, openUrl = openExternally }: InvitationScreenProps & { readonly only?: SectionId }): ReactNode {
  const t = useT();
  const { locale } = useLocalePreference();
  const origin = publicSiteOrigin();
  const url = useMemo(() => invitationUrl(origin, slug, only ?? null, locale), [origin, slug, only, locale]);
  // Read once per visit: the credential lives in memory (native) or in this tab's sessionStorage (web), never in the address.
  const credential = useMemo(() => (slug ? readGiftCredential(slug) : null), [slug]);
  const [phase, setPhase] = useState<FramePhase>("loading");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setPhase("loading"); setAttempt((value) => value + 1); }, []);

  // 404 is the answer for an unknown or unpublished slug, or a section the invitation does not have (A21).
  if (phase === "notFound") return <NotFound onNavigate={onNavigate} />;
  // The site itself failing (5xx) or no connection: trying again can work. A deployment that would load this screen into itself
  // cannot be fixed by the guest: no retry, only the way to the gifts.
  if (phase === "misconfigured") {
    return <LinkState illustration="offline" title={t("rsvp.invite.unavailableTitle")} body={t("rsvp.invite.unavailableBody")}><GiftsButton slug={slug} onNavigate={onNavigate} /></LinkState>;
  }
  if (phase === "offline" || phase === "unavailable") {
    return <OfflineState unavailable={phase === "unavailable"} onRetry={retry}><GiftsButton slug={slug} onNavigate={onNavigate} /></OfflineState>;
  }
  return (
    <View style={{ flex: 1 }} testID="invitation-screen">
      <SiteFrame key={attempt} mode="page" origin={origin} url={url} slug={slug} credential={credential} title={t("celebration.app.invitationFrame")} testID="invitation-frame" onApp={onNavigate} onExternal={openUrl} onPhase={setPhase} />
      {phase === "loading" ? <Loading slug={slug} onNavigate={onNavigate} /> : null}
    </View>
  );
}
