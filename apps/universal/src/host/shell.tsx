import { useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { brand, radius, spacing } from "@rsvp/design-tokens";
import { Logo, PageIntro, useColors, useThemedStyles, type Palette } from "@rsvp/ui";
import { useAuth } from "../auth/auth-context";
import { useT } from "../platform/providers";
import { useThemePreference } from "../platform/theme";

/**
 * Frame of every signed-in screen (host, admin, provider). Wide screens: a night sidebar with the
 * logo, the destinations and sign-out. Narrow screens: a night top bar and a bottom bar with the
 * main destinations plus "More" (the rest and sign-out). One layout is mounted at a time.
 *
 * Navigation has two levels (docs/design/upgrade-brief.md §2): few destinations in the sidebar / bottom bar, and
 * `SectionTabs` under the title with the screens of the active destination. Both come from one `NavItem[]`
 * built centrally (`hostNav`, `adminNav`, the portal frame); a screen only says which route key is `current`.
 */

const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
const WIDE = 960;
const SIDEBAR = 264;
const MAX_CONTENT = 1040;
const MIN_TOUCH = 44;
const BAR_SLOTS = 5;
const ring = (color: string): object => Platform.select({ web: { outlineColor: color, outlineWidth: 2, outlineOffset: -2 }, default: {} }) as object;
/** Focus ring on the night regions. */
const focusRing = ring(brand.cielo);

/** A screen inside a destination. `key` is the route key a screen passes as `current`. */
export interface NavTab { readonly key: string; readonly label: string; readonly href: string }
/** A destination of the menu. `tabs` are its screens (already translated); a destination with fewer than two shows no tab bar. */
export interface NavItem { readonly key: string; readonly label: string; readonly href: string; readonly tabs?: readonly NavTab[] }

/** A destination is current when `current` is its own key or the key of one of its tabs. */
export const isCurrentDestination = (item: NavItem, current: string | undefined): boolean => current !== undefined && (item.key === current || Boolean(item.tabs?.some((tab) => tab.key === current)));

/** Bottom bar: every destination plus "More" when they fit in five slots; otherwise four and the rest behind "More". */
export function barSplit(count: number, signedIn: boolean): number {
  return count + (signedIn ? 1 : 0) <= BAR_SLOTS ? count : BAR_SLOTS - 1;
}

/** Frame styles of one palette (light or dark). The night regions (sidebar, top bars, title block) use brand colours and stay the same in both. */
const createShellStyles = (palette: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  rootWide: { flexDirection: "row" },
  sidebar: { width: SIDEBAR, flexShrink: 0, backgroundColor: brand.noche, paddingTop: spacing[6], paddingBottom: spacing[4], paddingHorizontal: spacing[3] },
  sidebarLogo: { paddingHorizontal: spacing[3], paddingBottom: spacing[6] },
  sidebarList: { flex: 1 },
  sidebarItem: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[3], borderRadius: radius.md, marginBottom: 2 },
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
  bandInner: { width: "100%", maxWidth: MAX_CONTENT, alignSelf: "center", paddingHorizontal: spacing[8], paddingTop: spacing[8], paddingBottom: spacing[6], gap: spacing[2] },
  bandTabs: { width: "100%", maxWidth: MAX_CONTENT, alignSelf: "center", paddingHorizontal: spacing[8] },
  /* Narrow: the title sits on the night block and the content rises over it as a rounded sheet. */
  mHeader: { backgroundColor: brand.noche, paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: spacing[10], gap: spacing[2], overflow: "hidden" },
  mTabs: { marginHorizontal: -spacing[5], marginTop: spacing[2] },
  mTitle: { color: "#FFFFFF", fontSize: 30, lineHeight: 34, fontWeight: "800", letterSpacing: -0.9, fontFamily },
  mSheet: { flexGrow: 1, backgroundColor: palette.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -spacing[6], paddingHorizontal: spacing[4], paddingTop: spacing[5], paddingBottom: spacing[10], gap: spacing[4] },
  title: { color: palette.text, fontSize: 34, lineHeight: 38, fontWeight: "800", letterSpacing: -1, fontFamily },
  tabBar: { flexDirection: "row", backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border },
  tab: { flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 2 },
  tabDot: { width: 20, height: 3, borderRadius: 2, backgroundColor: "transparent" },
  tabDotActive: { backgroundColor: palette.primary },
  tabText: { color: palette.textMuted, fontSize: 11, fontWeight: "700", fontFamily },
  tabTextActive: { color: palette.primary },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: palette.scrim },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing[4], paddingBottom: spacing[6], gap: spacing[1], maxHeight: "85%" },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border, marginBottom: spacing[3] },
  sheetItem: { minHeight: 52, justifyContent: "center", paddingHorizontal: spacing[3], borderRadius: radius.md },
  sheetItemActive: { backgroundColor: palette.primaryMuted },
  sheetText: { color: palette.text, fontSize: 16, fontWeight: "600", fontFamily },
  sheetTextActive: { color: palette.primary, fontWeight: "700" },
  tabs: { flexDirection: "row", gap: spacing[1], paddingRight: spacing[4] },
  mTabsRow: { paddingHorizontal: spacing[5] },
  themeRow: { flexDirection: "row", gap: spacing[1], padding: 3, borderRadius: radius.full, borderWidth: 1, borderColor: palette.border },
  themeRowNight: { borderColor: "#2B3578" },
  themeOption: { flex: 1, minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing[2], borderRadius: radius.full },
  themeOptionOn: { backgroundColor: palette.primaryMuted },
  themeOptionOnNight: { backgroundColor: brand.medianoche },
  themeText: { color: palette.textMuted, fontSize: 13, fontWeight: "600", fontFamily },
  themeTextOn: { color: palette.text, fontWeight: "800" },
  themeTextNight: { color: brand.niebla },
  themeTextOnNight: { color: "#FFFFFF", fontWeight: "800" },
  sectionTab: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[4], borderBottomWidth: 3, borderBottomColor: "transparent" },
  sectionTabActive: { borderBottomColor: palette.primary },
  sectionTabText: { color: palette.textMuted, fontSize: 15, fontWeight: "600", fontFamily },
  sectionTabTextActive: { color: palette.text, fontWeight: "800" },
  mSectionTab: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[4], borderRadius: radius.full },
  mSectionTabActive: { backgroundColor: "#FFFFFF" },
  mSectionTabText: { color: brand.niebla, fontSize: 14, fontWeight: "600", fontFamily },
  mSectionTabTextActive: { color: brand.noche, fontWeight: "800" }
});

/**
 * The screens of the active destination as a tab list (`role=tablist`): 44 px targets, visible focus, horizontal scroll
 * on narrow screens, Left/Right/Home/End move the focus. Selecting a tab navigates to its route.
 */
function SectionTabs({ tabs, current, onNavigate, dark }: { readonly tabs: readonly NavTab[]; readonly current?: string; readonly onNavigate?: (href: string) => void; readonly dark: boolean }): ReactNode {
  const s = useThemedStyles(createShellStyles);
  const surfaceRing = ring(useColors().primary);
  const t = useT();
  const refs = useRef<(View | null)[]>([]);
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === current));
  const onKey = (event: { key: string; preventDefault: () => void }, index: number): void => {
    const last = tabs.length - 1;
    const next = event.key === "ArrowRight" ? (index === last ? 0 : index + 1) : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : event.key === "Home" ? 0 : event.key === "End" ? last : -1;
    if (next < 0) return;
    event.preventDefault();
    refs.current[next]?.focus();
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dark ? s.mTabsRow : undefined}>
      <View role="tablist" aria-label={t("host.tabs.label")} style={s.tabs}>
        {tabs.map((tab, index) => {
          const active = index === activeIndex;
          const box = dark ? [s.mSectionTab, active && s.mSectionTabActive] : [s.sectionTab, active && s.sectionTabActive];
          const text = dark ? [s.mSectionTabText, active && s.mSectionTabTextActive] : [s.sectionTabText, active && s.sectionTabTextActive];
          return (
            <Pressable key={tab.key} ref={(node) => { refs.current[index] = node; }} role="tab" aria-selected={active} aria-current={active ? "page" : undefined} onPress={() => onNavigate?.(tab.href)} {...({ onKeyDown: (event: { key: string; preventDefault: () => void }) => onKey(event, index) } as object)} style={[...box, dark ? focusRing : surfaceRing]}>
              <Text numberOfLines={1} style={text}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/** System · Light · Dark in one compact row (the full form, with its explanation, lives in Settings). */
function ThemeSwitch({ onNight = false }: { readonly onNight?: boolean }): ReactNode {
  const t = useT();
  const s = useThemedStyles(createShellStyles);
  const surfaceRing = ring(useColors().primary);
  const { preference, setPreference, options } = useThemePreference();
  return (
    <View role="radiogroup" aria-label={t("theme.label")} style={[s.themeRow, onNight && s.themeRowNight]}>
      {options.map((option) => {
        const on = option === preference;
        return (
          <Pressable key={option} role="radio" aria-checked={on} accessibilityLabel={t(`theme.${option}`)} testID={`theme-switch-${option}`} onPress={() => setPreference(option)} style={[s.themeOption, on && (onNight ? s.themeOptionOnNight : s.themeOptionOn), onNight ? focusRing : surfaceRing]}>
            <Text numberOfLines={1} style={[s.themeText, onNight && s.themeTextNight, on && (onNight ? s.themeTextOnNight : s.themeTextOn)]}>{t(`theme.${option}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Sidebar({ nav, current, onNavigate }: { readonly nav: readonly NavItem[]; readonly current?: string; readonly onNavigate?: (href: string) => void }): ReactNode {
  const s = useThemedStyles(createShellStyles);
  const t = useT();
  const auth = useAuth();
  return (
    <View style={s.sidebar}>
      <View style={s.sidebarLogo}><Logo tone="onDark" height={30} /></View>
      <ScrollView role="navigation" aria-label={t("host.nav.label")} style={s.sidebarList}>
        {nav.map((item) => {
          const active = isCurrentDestination(item, current);
          return (
            <Pressable key={item.key} role="link" aria-current={active ? "page" : undefined} onPress={() => onNavigate?.(item.href)} style={[s.sidebarItem, active && s.sidebarItemActive, focusRing]}>
              <View style={[s.bar, active && s.barActive]} />
              <Text style={[s.sidebarText, active && s.sidebarTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ marginTop: spacing[2] }}><ThemeSwitch onNight /></View>
      {auth.state.status === "authenticated" ? (
        <Pressable role="button" accessibilityLabel={t("common.signOut")} onPress={() => { void auth.signOut(); }} style={[s.signOut, focusRing]}>
          <Text style={s.sidebarText}>{t("common.signOut")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MobileFrame({ nav, current, onNavigate, children }: PropsWithChildren<{ readonly nav: readonly NavItem[]; readonly current?: string; readonly onNavigate?: (href: string) => void }>): ReactNode {
  const s = useThemedStyles(createShellStyles);
  const tabRing = ring(useColors().primary);
  const t = useT();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const signedIn = auth.state.status === "authenticated";
  const split = barSplit(nav.length, signedIn);
  const overflow = split < nav.length;
  const tabs = nav.slice(0, split);
  const rest = nav.slice(split);
  const hiddenActive = rest.some((item) => isCurrentDestination(item, current));
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
            const active = isCurrentDestination(item, current);
            return (
              <Pressable key={item.key} role="link" aria-current={active ? "page" : undefined} onPress={() => go(item.href)} style={[s.tab, tabRing]}>
                <View style={[s.tabDot, active && s.tabDotActive]} />
                <Text numberOfLines={1} style={[s.tabText, active && s.tabTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
          {overflow || signedIn ? (
            <Pressable role="button" aria-expanded={open} accessibilityLabel={t("common.more")} onPress={() => setOpen(true)} style={[s.tab, tabRing]}>
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
              {rest.map((item) => {
                const active = isCurrentDestination(item, current);
                return (
                  <Pressable key={item.key} role="link" aria-current={active ? "page" : undefined} onPress={() => go(item.href)} style={[s.sheetItem, active && s.sheetItemActive]}>
                    <Text style={[s.sheetText, active && s.sheetTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
              <View style={{ paddingHorizontal: spacing[3], paddingVertical: spacing[2] }}><ThemeSwitch /></View>
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
  const s = useThemedStyles(createShellStyles);
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

/**
 * `intro` is the optional warm line under the title (`PageIntro`). The tab bar of the active destination appears
 * under the title when `nav` has one with two or more tabs; a screen never builds its own.
 */
export function Screen({ title, intro, nav, current, onNavigate, children }: PropsWithChildren<{ readonly title: string; readonly intro?: string; readonly nav?: readonly NavItem[]; readonly current?: string; readonly onNavigate?: (href: string) => void }>): ReactNode {
  const s = useThemedStyles(createShellStyles);
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const items = nav ?? [];
  const sectionTabs = items.find((item) => isCurrentDestination(item, current))?.tabs;
  const tabs = sectionTabs && sectionTabs.length > 1 ? sectionTabs : undefined;
  if (wide) {
    const main = (
      <View style={s.scroll}>
        <View style={s.band}>
          <View style={s.bandInner}>
            <Text accessibilityRole="header" aria-level={1} style={s.title}>{title}</Text>
            {intro ? <PageIntro>{intro}</PageIntro> : null}
          </View>
          {tabs ? <View style={s.bandTabs}><SectionTabs tabs={tabs} current={current} onNavigate={onNavigate} dark={false} /></View> : null}
        </View>
        <ScrollView role="main" tabIndex={0} style={s.scroll} contentContainerStyle={[s.content, s.contentWide]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    );
    if (items.length === 0) return <View style={s.root}><BareFrame>{main}</BareFrame></View>;
    return <View style={[s.root, s.rootWide]}><Sidebar nav={items} current={current} onNavigate={onNavigate} />{main}</View>;
  }
  const body = (
    <ScrollView role="main" tabIndex={0} style={s.scroll} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={s.mHeader}>
        <Text accessibilityRole="header" aria-level={1} style={s.mTitle}>{title}</Text>
        {intro ? <PageIntro tone="onDark">{intro}</PageIntro> : null}
        {tabs ? <View style={s.mTabs}><SectionTabs tabs={tabs} current={current} onNavigate={onNavigate} dark /></View> : null}
      </View>
      <View style={s.mSheet}>{children}</View>
    </ScrollView>
  );
  if (items.length === 0) return <View style={s.root}><BareFrame>{body}</BareFrame></View>;
  return <View style={s.root}><MobileFrame nav={items} current={current} onNavigate={onNavigate}>{body}</MobileFrame></View>;
}
