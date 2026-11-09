import { useRef, type PropsWithChildren, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, useGlobalSearchParams, usePathname, useRouter, type Href } from "expo-router";
import { decideRoute, safeReturnTo, type RouteGroup } from "@rsvp/auth";
import { typography } from "@rsvp/design-tokens";
import { useColors } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { useAuth } from "./auth-context";
import { AuthLayout, useAuthStyles, SubmitButton } from "./auth-ui";
import { destinationAfterSignIn, firstStepFor, homeFor, loginHref } from "./routes";


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
  const authStyles = useAuthStyles();
  const t = useT();
  const palette = useColors();
  return (
    <View role="main" style={authStyles.centered} accessibilityLiveRegion="polite">
      <ActivityIndicator accessibilityLabel={t("auth.guard.checking")} color={palette.primary} />
      <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base }}>{t("auth.guard.checking")}</Text>
    </View>
  );
}

function Forbidden({ home }: { readonly home: string | null }): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const auth = useAuth();
  const goTo = useNavigateTo();
  return (
    <AuthLayout title={t("auth.guard.forbiddenTitle")} intro={home ? t("auth.guard.forbiddenBody") : t("auth.guard.noRole")} illustration="noAccess">
      <View style={authStyles.form}>
        {home ? <SubmitButton label={t("auth.guard.goHome")} busyLabel={t("auth.guard.goHome")} busy={false} onPress={() => goTo(home)} testID="forbidden-home" /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.signOut")} onPress={() => { void auth.signOut(); }} style={authStyles.link}><Text style={authStyles.linkText}>{t("common.signOut")}</Text></Pressable>
      </View>
    </AuthLayout>
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
export function RouteGuard({ group, children }: PropsWithChildren<{ readonly group: RouteGroup }>): ReactNode {
  const { state } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  if (state.status === "loading") return <Checking />;
  const decision = decideRoute(state.session ? state.session.roles : null, group);
  if (decision.type === "login") return <Redirect href={loginHref(currentLocation(pathname, params)) as Href} />;
  if (decision.type === "forbidden") return <Forbidden home={state.session ? homeFor(state.session.roles) : null} />;
  return <>{children}</>;
}

/** Public auth pages: someone who is already signed in goes straight to their space (or back to where they came from). */
export function RedirectIfSignedIn({ returnTo, newAccount = false, children }: PropsWithChildren<{ readonly returnTo: string | null; /** Sign-up page: an account created right here goes to the first step of its role instead of the usual home. */ readonly newAccount?: boolean }>): ReactNode {
  const { state } = useAuth();
  const arrivedAnonymous = useRef<boolean | null>(null);
  if (state.status === "loading") return <Checking />;
  if (arrivedAnonymous.current === null) arrivedAnonymous.current = !state.session;
  if (state.session) {
    const fresh = newAccount && arrivedAnonymous.current && !safeReturnTo(returnTo) ? firstStepFor(state.session.roles) : null;
    return <Redirect href={(fresh ?? destinationAfterSignIn(state.session.roles, returnTo)) as Href} />;
  }
  return <>{children}</>;
}

