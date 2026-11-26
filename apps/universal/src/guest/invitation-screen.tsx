import { useMemo, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import {
  hasSectionContent, layoutOf, readContent, SECTION_PATHS, sectionForPath, themeFromTemplate,
  type GalleryImage, type PublicCelebrationView, type SectionId
} from "@rsvp/celebration-theme";
import { CelebrationNativeRenderer, type NativeRendererActions } from "@rsvp/celebration-theme/native";
import { spacing } from "@rsvp/design-tokens";
import { createTranslator, resolveLocale, supportedLocales, type AppLocale } from "@rsvp/i18n";
import { usePublicGallery, usePublicInvitation, useTemplate } from "@rsvp/query-hooks";
import { Skeleton, fonts, useColors } from "@rsvp/ui";
import { asTemplateDocument } from "../host/template-gallery";
import { ActionButton } from "../host/ui";
import { partnerRedirectUrl } from "../platform/partner-link";
import { useApiClient, useLocalePreference, useT } from "../platform/providers";
import { readGiftCredential } from "./gift-credential";
import { invitationIcon } from "./invitation-icon";
import { LinkState, OfflineState } from "./link-states";

/**
 * A1–A8 in the app: the public invitation `/c/{slug}` and each section's own page `/c/{slug}/{section}`, the mirror of
 * the public site. Same reads as the web page (the celebration in the guest's language, its template and its photos), the
 * same renderer contract, and the same 404 rule: a section the template does not place or that has no content is not a page.
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

/** The redirector URL for a recommendation, or null when the listing id is not one the redirector accepts. */
function partnerUrlFor(celebrationId: string): (listingId: string) => string | null {
  return (listingId) => {
    try { return partnerRedirectUrl(listingId, { surface: "APP", celebrationId }); } catch { return null; }
  };
}

function Loading(): ReactNode {
  const t = useT();
  const palette = useColors();
  return (
    <View role="main" accessibilityLabel={t("common.loading")} aria-busy style={{ flex: 1, backgroundColor: palette.canvas, padding: spacing[4], gap: spacing[4] }} testID="invitation-loading">
      <View style={{ alignItems: "center", gap: spacing[3], paddingVertical: spacing[8] }}>
        <Skeleton width={96} height={12} /><Skeleton width="80%" height={40} /><Skeleton width="50%" height={16} />
      </View>
      {[0, 1, 2].map((row) => <View key={row} style={{ gap: spacing[2] }}><Skeleton width="40%" height={20} /><Skeleton width="100%" height={14} /><Skeleton width="90%" height={14} /></View>)}
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

/**
 * The celebration's own languages, as the web page offers them; choosing one reads the invitation again in it.
 * It sits on the invitation, so it takes the invitation's ink, not the app's scheme (a dark app would write light on light).
 */
function CelebrationLanguages({ available, ink, accent }: { readonly available: readonly string[]; readonly ink: string; readonly accent: string }): ReactNode {
  const { locale, setLocale } = useLocalePreference();
  const t = useT();
  const languages = supportedLocales.filter((candidate) => available.includes(candidate));
  if (languages.length < 2) return null;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t("celebration.language.label")} style={{ flexDirection: "row", justifyContent: "center", gap: spacing[4], paddingVertical: spacing[2] }} testID="invitation-languages">
      {languages.map((option: AppLocale) => (
        <Pressable key={option} accessibilityRole="radio" aria-checked={option === locale} accessibilityState={{ checked: option === locale }} onPress={() => setLocale(option)} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: spacing[2] }}>
          <Text lang={option} style={{ color: option === locale ? accent : ink, fontFamily: fonts.sans, fontWeight: option === locale ? "700" : "400", textDecorationLine: option === locale ? "underline" : "none" }}>{t(`celebration.language.${option}`)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function InvitationScreen(props: InvitationScreenProps): ReactNode {
  // A path that is not a section is not a page: answered before anything is requested.
  const only = props.section === undefined ? undefined : sectionForPath(props.section);
  if (props.section !== undefined && !only) return <NotFound onNavigate={props.onNavigate} />;
  return <Invitation {...props} {...(only ? { only } : {})} />;
}

function Invitation({ slug, only, onNavigate, openUrl = openExternally }: InvitationScreenProps & { readonly only?: SectionId }): ReactNode {
  const client = useApiClient();
  const { locale } = useLocalePreference();
  const celebration = usePublicInvitation<PublicCelebrationView>(client, slug, locale);
  const view = celebration.data;
  const template = useTemplate(client, view?.templateId ?? null);
  const gallery = usePublicGallery(client, view?.celebrationId);
  const actions = useMemo<NativeRendererActions | undefined>(() => view ? {
    openUrl,
    partnerUrl: partnerUrlFor(view.celebrationId),
    openSection: (next) => onNavigate(invitationPath(slug, next)),
    openRsvp: () => onNavigate(replyPath(slug))
  } : undefined, [view, openUrl, onNavigate, slug]);
  // Read once per slug: the credential lives in memory (native) or in this tab's sessionStorage (web), never in the URL.
  const hasPersonalLink = useMemo(() => Boolean(slug && readGiftCredential(slug)), [slug]);

  if (celebration.isPending) return <Loading />;
  if (celebration.isError || !view) {
    const status = celebration.error instanceof ApiError ? celebration.error.status : 0;
    // 404 is the answer for an unknown or unpublished slug (A21); anything else is a connection or server failure.
    if (status === 404) return <NotFound onNavigate={onNavigate} />;
    return <OfflineState unavailable={status >= 500} onRetry={() => { void celebration.refetch(); }} />;
  }
  // The template and the photos only dress the page: while they load the page waits, and when they fail it renders
  // with the default look and no photos instead of failing the whole invitation (as the web page does).
  if ((view.templateId && template.isPending) || gallery.isPending) return <Loading />;
  const photos: readonly GalleryImage[] = gallery.data?.items ?? [];
  const theme = themeFromTemplate(template.data ? asTemplateDocument(template.data) : null, view.enabledSections);
  if (only && !(theme.sections.includes(only) && hasSectionContent(only, readContent(view), photos))) return <NotFound onNavigate={onNavigate} />;
  // Section names and notes follow the invitation's language, as on the web, even if the app was left in another one.
  const t = createTranslator(resolveLocale(view.locale, []));
  return (
    <ScrollView role="main" tabIndex={0} style={{ flex: 1, backgroundColor: theme.palette.canvas }} contentContainerStyle={{ flexGrow: 1 }} testID="invitation-screen">
      {/* The layout's column width, centred, as the web page's --celebration-max-width: a tablet or desktop window does not stretch the invitation. */}
      <View style={{ width: "100%", maxWidth: layoutOf(theme).maxWidth, alignSelf: "center" }} testID="invitation-column">
        <CelebrationLanguages available={view.availableLocales} ink={theme.palette.text} accent={theme.palette.accent} />
        <CelebrationNativeRenderer theme={theme} view={view} gallery={photos} t={t} {...(only ? { only } : {})} {...(actions ? { actions } : {})} renderIcon={invitationIcon} hasPersonalLink={hasPersonalLink} />
      </View>
    </ScrollView>
  );
}
