import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { I18nContext } from "react-i18next";
import { usePathname, useRouter } from "expo-router";
import { colors, radius, spacing, typography, type ColorTheme } from "@rsvp/design-tokens";
import { createTranslator, resolveLocale, type AppLocale } from "@rsvp/i18n";
import { routeShape } from "@rsvp/telemetry";
import { deviceLanguages } from "./device-languages";
import { readLocalePreference } from "./preferences";
import { appTelemetry } from "./telemetry";
import { useScheme } from "./theme";

/** What Expo Router hands to a route's `ErrorBoundary` export (`ErrorBoundaryProps` of expo-router). */
export interface RouteErrorProps {
  readonly error: Error;
  readonly retry: () => Promise<void>;
}

const MIN_TOUCH = 44;

/**
 * The language of the fallback. Inside the app's providers it is the active one; the root boundary renders outside them
 * (the root layout is what failed), so it uses the stored choice, then the device's languages, then es-BO.
 */
function useFallbackLocale(): AppLocale {
  const active = useContext(I18nContext)?.i18n?.language;
  const [stored, setStored] = useState<string | null>(null);
  useEffect(() => {
    if (active) return;
    let alive = true;
    void readLocalePreference().then((value) => { if (alive) setStored(value); });
    return () => { alive = false; };
  }, [active]);
  return resolveLocale(active ?? stored, deviceLanguages());
}

function createStyles(palette: (typeof colors)[ColorTheme]) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.canvas, alignItems: "center", justifyContent: "center", padding: spacing[6] },
    column: { width: "100%", maxWidth: 440, gap: spacing[4] },
    title: { color: palette.text, fontSize: typography.fontSize["2xl"], lineHeight: typography.lineHeight["2xl"], fontWeight: "500", letterSpacing: -0.6 },
    body: { color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base },
    detail: { color: palette.textMuted, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: Platform.select({ web: "ui-monospace, monospace", default: undefined }) },
    actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[4], marginTop: spacing[2] },
    primary: { minHeight: MIN_TOUCH + 4, minWidth: MIN_TOUCH, alignItems: "center", justifyContent: "center", borderRadius: radius.button, backgroundColor: palette.primary, paddingHorizontal: spacing[5] },
    primaryText: { color: palette.onPrimary, fontSize: typography.fontSize.base, fontWeight: "500" },
    link: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center" },
    linkText: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: "500", textDecorationLine: "underline" },
    pressed: { opacity: 0.7 }
  });
}

const stylesByScheme = { light: createStyles(colors.light), dark: createStyles(colors.dark) } as const;

/**
 * Fallback for a render error anywhere below a layout that exports it (M11). The person reads, in their language, that
 * this part did not load, and can retry it (Expo Router re-renders the route) or go to the start. The error is reported
 * once to `@rsvp/telemetry`: type, scrubbed message and stack, the route *shape* and the boundary, never personal data.
 * It depends on no app context, so the same screen works for the root layout, whose providers are what may have failed.
 */
export function RouteErrorScreen({ error, retry, boundary }: RouteErrorProps & { readonly boundary: string }): ReactNode {
  const locale = useFallbackLocale();
  const t = useMemo(() => createTranslator(locale), [locale]);
  const styles = stylesByScheme[useScheme()];
  const pathname = usePathname();
  const router = useRouter();
  const reported = useRef<Error | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    appTelemetry.captureException(error, { boundary, route: routeShape(pathname ?? ""), platform: Platform.OS });
  }, [error, boundary, pathname]);

  const onRetry = (): void => {
    setRetrying(true);
    void retry().finally(() => setRetrying(false));
  };
  const goHome = (): void => {
    // The web reloads the document at "/" so a broken in-memory state does not survive; native navigates.
    if (Platform.OS === "web" && typeof window !== "undefined") window.location.assign("/");
    else router.replace("/");
  };

  return (
    <View style={styles.root} testID="route-error" accessibilityRole="alert">
      <View style={styles.column}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>{t("errorBoundary.title")}</Text>
        <Text style={styles.body}>{t("errorBoundary.body")}</Text>
        {__DEV__ ? <Text style={styles.detail} testID="route-error-detail">{`${error.name}: ${error.message}`}</Text> : null}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={retrying} accessibilityState={{ disabled: retrying, busy: retrying }} onPress={onRetry} testID="route-error-retry" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{t("errorBoundary.retry")}</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={goHome} testID="route-error-home" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <Text style={styles.linkText}>{t("errorBoundary.home")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** `export const ErrorBoundary = errorBoundaryFor("host")` in a layout: the fallback, tagged with the area that failed. */
export function errorBoundaryFor(boundary: string): (props: RouteErrorProps) => ReactNode {
  const Boundary = (props: RouteErrorProps): ReactNode => <RouteErrorScreen {...props} boundary={boundary} />;
  Boundary.displayName = `ErrorBoundary(${boundary})`;
  return Boundary;
}
