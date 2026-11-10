import { useRef, type PropsWithChildren, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, useGlobalSearchParams, usePathname, useRouter, type Href } from "expo-router";
import { decideRoute, type RouteGroup } from "@rsvp/auth";
import { colors, spacing, typography } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { useAuth } from "./auth-context";
import { authStyles, LanguageSwitch, SubmitButton } from "./auth-ui";
import { destinationAfterSignIn, homeFor, loginHref } from "./routes";

const palette = colors.light;

/** The path the person was trying to open, with its query, so sign-in can bring them back to it. */
export function currentLocation(pathname: string, params: Readonly<Record<string, string | string[] | undefined>>): string {
  const query = new URLSearchParams();
  const segments = pathname.split("/");
  for (const [key, value] of Object.entries(params)) {
    if (key === "returnTo") continue;
    const first = Array.isArray(value) ? value[0] : value;
    // Dynamic route segments (`/editor/[section]`) come back as params too; the pathname already carries them.
    if (first !== undefined && !segments.includes(first)) query.set(key, first);
  }
  const text = query.toString();
  return text ? `${pathname}?${text}` : pathname;
}

export function Checking(): ReactNode {
  const t = useT();
  return (
    <View role="main" style={authStyles.centered} accessibilityLiveRegion="polite">
      <ActivityIndicator accessibilityLabel={t("auth.guard.checking")} color={palette.primary} />
      <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base }}>{t("auth.guard.checking")}</Text>
    </View>
  );
}

function Forbidden({ home }: { readonly home: string | null }): ReactNode {
  const t = useT();
  const auth = useAuth();
  const goTo = useNavigateTo();
  return (
    <View role="main" style={authStyles.centered}>
      <View style={{ width: "100%", maxWidth: 420, gap: spacing[4] }}>
        <Text accessibilityRole="header" aria-level={1} style={authStyles.title}>{t("auth.guard.forbiddenTitle")}</Text>
        <Text style={authStyles.intro}>{home ? t("auth.guard.forbiddenBody") : t("auth.guard.noRole")}</Text>
        {home ? <SubmitButton label={t("auth.guard.goHome")} busyLabel={t("auth.guard.goHome")} busy={false} onPress={() => goTo(home)} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.signOut")} onPress={() => { void auth.signOut(); }} style={authStyles.link}><Text style={authStyles.linkText}>{t("common.signOut")}</Text></Pressable>
        <LanguageSwitch />
      </View>
    </View>
  );
}

function useNavigateTo(): (href: string) => void {
  const router = useRouter();
  return (href) => router.replace(href as Href);
}

/**
 * Guards a route group by role (REQ-F05-03). Anonymous visitors go to sign-in carrying the page
 * they wanted; signed-in people without the role see why, with a way to their own space.
 */
export function RouteGuard({ group, returnTo, children }: PropsWithChildren<{ readonly group: RouteGroup; readonly returnTo?: string }>): ReactNode {
  const { state } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const recovery = useRef(returnTo);
  // An explicit resource destination survives the router's intermediate state while redirecting to sign-in.
  if (state.session || returnTo) recovery.current = returnTo;
  if (state.status === "loading") return <Checking />;
  const decision = decideRoute(state.session ? state.session.roles : null, group);
  if (decision.type === "login") return <Redirect href={loginHref(recovery.current ?? currentLocation(pathname, params)) as Href} />;
  if (decision.type === "forbidden") return <Forbidden home={state.session ? homeFor(state.session.roles) : null} />;
  return <>{children}</>;
}

/** Public auth pages: someone who is already signed in goes straight to their space (or back to where they came from). */
export function RedirectIfSignedIn({ returnTo, children }: PropsWithChildren<{ readonly returnTo: string | null }>): ReactNode {
  const { state } = useAuth();
  if (state.status === "loading") return <Checking />;
  if (state.session) return <Redirect href={destinationAfterSignIn(state.session.roles, returnTo) as Href} />;
  return <>{children}</>;
}

