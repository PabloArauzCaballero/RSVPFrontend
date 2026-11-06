import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { brand, colors, radius, spacing } from "@rsvp/design-tokens";
import { Logo } from "@rsvp/ui";
import { useAuth } from "../auth/auth-context";
import { useT } from "../platform/providers";

/**
 * Frame of every signed-in screen (host, admin, provider). Wide screens: a night sidebar with the
 * logo, the sections and sign-out. Narrow screens: a night top bar and a bottom tab bar with the
 * first sections plus "More" (the rest and sign-out). One layout is mounted at a time.
 */

const palette = colors.light;
const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
const WIDE = 960;
const SIDEBAR = 264;
const MAX_CONTENT = 1040;
const MIN_TOUCH = 44;
const TABS = 4;
const focusRing = Platform.select({ web: { outlineColor: brand.cielo, outlineWidth: 2, outlineOffset: -2 }, default: {} }) as object;

export interface NavItem { readonly key: string; readonly label: string; readonly href: string; /** Already translated section heading; shown once above the first item of each run. */ readonly group?: string }

/** True when `index` starts a new group, so the heading is drawn once. */
const startsGroup = (nav: readonly NavItem[], index: number): boolean => Boolean(nav[index]?.group) && nav[index]?.group !== nav[index - 1]?.group;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  rootWide: { flexDirection: "row" },
  sidebar: { width: SIDEBAR, flexShrink: 0, backgroundColor: brand.noche, paddingTop: spacing[6], paddingBottom: spacing[4], paddingHorizontal: spacing[3] },
  sidebarLogo: { paddingHorizontal: spacing[3], paddingBottom: spacing[6] },
  sidebarList: { flex: 1 },
  sidebarItem: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[3], borderRadius: radius.md, marginBottom: 2 },
  groupLabel: { color: "#6F7BB5", fontSize: 11, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", paddingHorizontal: spacing[3], paddingTop: spacing[4], paddingBottom: spacing[1], fontFamily },
  sheetGroup: { color: palette.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", paddingHorizontal: spacing[3], paddingTop: spacing[3], paddingBottom: spacing[1], fontFamily },
  sidebarItemActive: { backgroundColor: brand.medianoche },
  bar: { width: 3, height: 18, borderRadius: 2, backgroundColor: "transparent" },
  barActive: { backgroundColor: brand.azulCl },
  sidebarText: { color: brand.niebla, fontSize: 15, fontWeight: "600", fontFamily },
  sidebarTextActive: { color: "#FFFFFF", fontWeight: "700" },
  signOut: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[3], borderRadius: radius.md, borderTopWidth: 1, borderTopColor: "#1E2760", marginTop: spacing[2] },
  topBar: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[5], backgroundColor: brand.noche },
  scroll: { flex: 1 },
  content: { width: "100%", maxWidth: MAX_CONTENT, alignSelf: "center", paddingHorizontal: spacing[4], paddingTop: spacing[5], paddingBottom: spacing[10], gap: spacing[4] },
  contentWide: { paddingHorizontal: spacing[8], paddingTop: spacing[10], gap: spacing[5] },
  header: { gap: spacing[1], paddingBottom: spacing[1] },
  /* Wide: a fixed white band with the page title, aligned to the content column. */
  band: { backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border },
  bandInner: { width: "100%", maxWidth: MAX_CONTENT, alignSelf: "center", paddingHorizontal: spacing[8], paddingTop: spacing[8], paddingBottom: spacing[6], gap: spacing[1] },
  /* Narrow: the title sits on the night block and the content rises over it as a rounded sheet. */
  mHeader: { backgroundColor: brand.noche, paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: spacing[10], gap: spacing[1], overflow: "hidden" },
  mTitle: { color: "#FFFFFF", fontSize: 30, lineHeight: 34, fontWeight: "800", letterSpacing: -0.9, fontFamily },
  mSheet: { flexGrow: 1, backgroundColor: palette.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -spacing[6], paddingHorizontal: spacing[4], paddingTop: spacing[5], paddingBottom: spacing[10], gap: spacing[4] },
  title: { color: palette.text, fontSize: 34, lineHeight: 38, fontWeight: "800", letterSpacing: -1, fontFamily },
  tabBar: { flexDirection: "row", backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border },
  tab: { flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 2 },
  tabDot: { width: 20, height: 3, borderRadius: 2, backgroundColor: "transparent" },
  tabDotActive: { backgroundColor: brand.azul },
  tabText: { color: palette.textMuted, fontSize: 11, fontWeight: "700", fontFamily },
  tabTextActive: { color: brand.azul },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,16,51,0.6)" },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing[4], paddingBottom: spacing[6], gap: spacing[1], maxHeight: "85%" },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border, marginBottom: spacing[3] },
  sheetItem: { minHeight: 52, justifyContent: "center", paddingHorizontal: spacing[3], borderRadius: radius.md },
  sheetItemActive: { backgroundColor: palette.primaryMuted },
  sheetText: { color: palette.text, fontSize: 16, fontWeight: "600", fontFamily },
  sheetTextActive: { color: brand.azul, fontWeight: "700" }
});

function Sidebar({ nav, current, onNavigate }: { readonly nav: readonly NavItem[]; readonly current?: string; readonly onNavigate?: (href: string) => void }): ReactNode {
  const t = useT();
  const auth = useAuth();
  return (
    <View style={s.sidebar}>
      <View style={s.sidebarLogo}><Logo tone="onDark" height={30} /></View>
      <ScrollView role="navigation" aria-label={t("host.nav.label")} style={s.sidebarList}>
        {nav.map((item, index) => {
          const active = item.key === current;
          return (
            <View key={item.key}>
              {startsGroup(nav, index) ? <Text style={s.groupLabel}>{item.group}</Text> : null}
              <Pressable role="link" aria-current={active ? "page" : undefined} onPress={() => onNavigate?.(item.href)} style={[s.sidebarItem, active && s.sidebarItemActive, focusRing]}>
                <View style={[s.bar, active && s.barActive]} />
                <Text style={[s.sidebarText, active && s.sidebarTextActive]}>{item.label}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      {auth.state.status === "authenticated" ? (
        <Pressable role="button" accessibilityLabel={t("common.signOut")} onPress={() => { void auth.signOut(); }} style={[s.signOut, focusRing]}>
          <Text style={s.sidebarText}>{t("common.signOut")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MobileFrame({ nav, current, onNavigate, children }: PropsWithChildren<{ readonly nav: readonly NavItem[]; readonly current?: string; readonly onNavigate?: (href: string) => void }>): ReactNode {
  const t = useT();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const signedIn = auth.state.status === "authenticated";
  const overflow = nav.length > TABS;
  const tabs = overflow ? nav.slice(0, TABS) : nav;
  const hiddenActive = overflow && nav.slice(TABS).some((item) => item.key === current);
  const go = (href: string): void => { setOpen(false); onNavigate?.(href); };
  return (
    <>
      <View style={{ backgroundColor: brand.noche }}>
        <View style={s.topBar}>
          <Logo tone="onDark" height={26} />
        </View>
      </View>
      {children}
      {nav.length ? (
        <View role="navigation" aria-label={t("host.nav.label")} style={s.tabBar}>
          {tabs.map((item) => {
            const active = item.key === current;
            return (
              <Pressable key={item.key} role="link" aria-current={active ? "page" : undefined} onPress={() => go(item.href)} style={[s.tab, focusRing]}>
                <View style={[s.tabDot, active && s.tabDotActive]} />
                <Text numberOfLines={1} style={[s.tabText, active && s.tabTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
          {overflow || signedIn ? (
            <Pressable role="button" aria-expanded={open} accessibilityLabel={t("common.more")} onPress={() => setOpen(true)} style={[s.tab, focusRing]}>
              <View style={[s.tabDot, hiddenActive && s.tabDotActive]} />
              <Text style={[s.tabText, hiddenActive && s.tabTextActive]}>{t("common.more")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel={t("common.close")} style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable accessibilityViewIsModal style={s.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={s.grabber} />
            <ScrollView>
              {nav.map((item, index) => {
                const active = item.key === current;
                return (
                  <View key={item.key}>
                    {startsGroup(nav, index) ? <Text style={s.sheetGroup}>{item.group}</Text> : null}
                    <Pressable role="link" aria-current={active ? "page" : undefined} onPress={() => go(item.href)} style={[s.sheetItem, active && s.sheetItemActive]}>
                      <Text style={[s.sheetText, active && s.sheetTextActive]}>{item.label}</Text>
                    </Pressable>
                  </View>
                );
              })}
              {signedIn ? (
                <Pressable role="button" accessibilityLabel={t("common.signOut")} onPress={() => { setOpen(false); void auth.signOut(); }} style={s.sheetItem}>
                  <Text style={s.sheetText}>{t("common.signOut")}</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Focused flows without sections (onboarding, access denied): the logo and sign-out, nothing else. */
function BareFrame({ children }: PropsWithChildren): ReactNode {
  const t = useT();
  const auth = useAuth();
  return (
    <>
      <View style={{ backgroundColor: brand.noche }}>
        <View style={s.topBar}>
          <Logo tone="onDark" height={26} />
          {auth.state.status === "authenticated" ? (
            <Pressable role="button" accessibilityLabel={t("common.signOut")} onPress={() => { void auth.signOut(); }} style={[{ minHeight: MIN_TOUCH, justifyContent: "center" }, focusRing]}>
              <Text style={s.sidebarText}>{t("common.signOut")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {children}
    </>
  );
}

export function Screen({ title, nav, current, onNavigate, children }: PropsWithChildren<{ readonly title: string; readonly nav?: readonly NavItem[]; readonly current?: string; readonly onNavigate?: (href: string) => void }>): ReactNode {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const items = nav ?? [];
  if (wide) {
    const main = (
      <View style={s.scroll}>
        <View style={s.band}>
          <View style={s.bandInner}>
            <Text accessibilityRole="header" aria-level={1} style={s.title}>{title}</Text>
          </View>
        </View>
        <ScrollView role="main" style={s.scroll} contentContainerStyle={[s.content, s.contentWide]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    );
    if (items.length === 0) return <View style={s.root}><BareFrame>{main}</BareFrame></View>;
    return <View style={[s.root, s.rootWide]}><Sidebar nav={items} current={current} onNavigate={onNavigate} />{main}</View>;
  }
  const body = (
    <ScrollView role="main" style={s.scroll} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={s.mHeader}>
        <Text accessibilityRole="header" aria-level={1} style={s.mTitle}>{title}</Text>
      </View>
      <View style={s.mSheet}>{children}</View>
    </ScrollView>
  );
  if (items.length === 0) return <View style={s.root}><BareFrame>{body}</BareFrame></View>;
  return <View style={s.root}><MobileFrame nav={items} current={current} onNavigate={onNavigate}>{body}</MobileFrame></View>;
}
