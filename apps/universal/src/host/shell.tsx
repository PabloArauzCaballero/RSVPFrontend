import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type ViewStyle } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Logo, NavIcon, OverlayEnter, PageIntro, PressFeedback, ScreenTransition, StickyActions, fonts, overlayAnimation, useColors, useThemedStyles, type Palette } from "@rsvp/ui";
import { useAuth } from "../auth/auth-context";
import { useT } from "../platform/providers";
import { useThemePreference } from "../platform/theme";

/**
 * Frame of every signed-in screen (host, admin, provider), laid out like a printed invitation: warm paper canvas, ink,
 * hairlines. Wide screens: a light sidebar with the logo, the destinations and sign-out. Narrow screens: a light top bar
 * on the canvas and a bottom bar with the main destinations plus "More" (the rest and sign-out). One layout is mounted at a time.
 *
 * Navigation has two levels (docs/design/upgrade-brief.md §2): few destinations in the sidebar / bottom bar, and
 * `SectionTabs` under the title with the screens of the active destination. Both come from one `NavItem[]`
 * built centrally (`hostNav`, `adminNav`, the portal frame); a screen only says which route key is `current`.
 */

const fontFamily = fonts.sans;
const fontDisplay = fonts.display;
const WIDE = 960;
/** From this width the primary action sits in the header; below it, in the sticky bottom bar. */
// Below the desktop shell the header scrolls away with the page, so the primary action lives in the sticky bar.
const ACTIONS_IN_HEADER = WIDE;
const SIDEBAR = 248;
const MAX_CONTENT = 960;
const MIN_TOUCH = 44;
const BAR_SLOTS = 5;
const ring = (color: string): object => Platform.select({ web: { outlineColor: color, outlineWidth: 2, outlineOffset: -2 }, default: {} }) as object;

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

/** Frame styles of one palette (light or dark): paper canvas, 1 px hairlines, ink text, no shadows. */
const createShellStyles = (palette: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  rootWide: { flexDirection: "row" },
  sidebar: { width: SIDEBAR, flexShrink: 0, backgroundColor: palette.surfaceMuted, borderRightWidth: 1, borderRightColor: palette.border, paddingTop: spacing[8], paddingBottom: spacing[4], paddingHorizontal: spacing[4] },
  sidebarLogo: { paddingHorizontal: spacing[3], paddingBottom: spacing[12] },
  sidebarList: { flex: 1 },
  sidebarItem: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[3], borderRadius: radius.md, marginBottom: spacing[1] },
  sidebarItemActive: { backgroundColor: palette.primaryMuted },
  sidebarText: { color: palette.textMuted, fontSize: 15, fontWeight: "500", fontFamily },
  sidebarTextActive: { color: palette.text, fontWeight: "600" },
  signOut: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[3], borderRadius: radius.md, borderTopWidth: 1, borderTopColor: palette.border, marginTop: spacing[2] },
  topBar: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[5], backgroundColor: palette.canvas, borderBottomWidth: 1, borderBottomColor: palette.border },
  scroll: { flex: 1 },
  content: { width: "100%", maxWidth: MAX_CONTENT, alignSelf: "center", paddingHorizontal: spacing[4], paddingTop: spacing[5], paddingBottom: spacing[16], gap: spacing[6] },
  contentWide: { paddingHorizontal: spacing[12], paddingTop: spacing[10], gap: spacing[10] },
  /* Wide: the page title on the canvas, aligned to the content column, a hairline under it. */
  band: { borderBottomWidth: 1, borderBottomColor: palette.border },
  bandInner: { width: "100%", maxWidth: MAX_CONTENT, alignSelf: "center", paddingHorizontal: spacing[12], paddingTop: spacing[16], paddingBottom: spacing[8], gap: spacing[3] },
  bandTabs: { width: "100%", maxWidth: MAX_CONTENT, alignSelf: "center", paddingHorizontal: spacing[12] },
  /* Narrow: the title opens the scrolling page, on the canvas. */
  mHeader: { paddingHorizontal: spacing[5], paddingTop: spacing[8], paddingBottom: spacing[3], gap: spacing[3] },
  /* Title (and intro) on the left, menu + primary action on the right, centred on the first title line. */
  headRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing[4] },
  headText: { flex: 1, minWidth: 0, gap: spacing[3] },
  headActions: { flexDirection: "row", alignItems: "center", gap: spacing[2], flexShrink: 0, minHeight: 52, marginTop: -4 },
  mTabs: { marginHorizontal: -spacing[5], marginTop: spacing[2] },
  mTitle: { color: palette.text, fontSize: 32, lineHeight: 36, fontWeight: "500", letterSpacing: -0.9, fontFamily: fontDisplay },
  mSheet: { flexGrow: 1, paddingHorizontal: spacing[5], paddingTop: spacing[6], paddingBottom: spacing[12], gap: spacing[8] },
  title: { color: palette.text, fontSize: 40, lineHeight: 44, fontWeight: "600", letterSpacing: -1.4, fontFamily: fontDisplay },
  tabBar: { flexDirection: "row", backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border, ...(Platform.OS === "web" ? ({ paddingBottom: "env(safe-area-inset-bottom)" } as object) : null) },
  tab: { flex: 1, minHeight: 64 },
  tabInner: { alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 0 },
  tabDot: { width: 20, height: 2, borderRadius: 1, backgroundColor: "transparent" },
  tabDotActive: { backgroundColor: palette.primary },
  tabText: { color: palette.textMuted, fontSize: 11, fontWeight: "500", fontFamily },
  tabTextActive: { color: palette.text, fontWeight: "600" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: palette.scrim },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing[4], paddingBottom: spacing[6], ...(Platform.OS === "web" ? ({ paddingBottom: "max(24px, env(safe-area-inset-bottom))" } as object) : null), gap: spacing[1], maxHeight: "85%" },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border, marginBottom: spacing[3] },
  sheetItem: { minHeight: 52, justifyContent: "center", paddingHorizontal: spacing[3], borderRadius: radius.md },
  sheetItemActive: { backgroundColor: palette.surfaceMuted },
  sheetText: { color: palette.text, fontSize: 16, fontWeight: "500", fontFamily },
  sheetTextActive: { color: palette.text, fontWeight: "600" },
  tabs: { flexDirection: "row", gap: spacing[3], paddingRight: spacing[4] },
  mTabsRow: { paddingHorizontal: spacing[5] },
  themeRow: { flexDirection: "row", gap: spacing[1], padding: 3, borderRadius: radius.md, borderWidth: 1, borderColor: palette.border },
  themeOption: { flex: 1, minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: 2, borderRadius: radius.sm },
  themeOptionOn: { backgroundColor: palette.surfaceMuted },
  themeText: { color: palette.textMuted, fontSize: 12, fontWeight: "500", fontFamily },
  themeTextOn: { color: palette.text, fontWeight: "600" },
  sectionTab: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[4], borderBottomWidth: 2, borderBottomColor: "transparent" },
  sectionTabActive: { borderBottomColor: palette.primary },
  sectionTabText: { color: palette.textMuted, fontSize: 15, fontWeight: "500", fontFamily },
  sectionTabTextActive: { color: palette.text, fontWeight: "600" }
});

const FADE_WIDTH = 24;
const EDGE_SLACK = 4;

/** Edge cue over a horizontal scroller: a solid strip on the canvas with a drawn chevron on the side that has more. Decorative, never takes touches, no gradient. */
function EdgeFade({ side, color }: { readonly side: "left" | "right"; readonly color: string }): ReactNode {
  const palette = useColors();
  return (
    <View aria-hidden pointerEvents="none" testID={`tabs-fade-${side}`} style={{ position: "absolute", top: 0, bottom: 0, width: FADE_WIDTH, [side]: 0, backgroundColor: color, alignItems: "center", justifyContent: "center" } as ViewStyle}>
      <View style={{ width: 7, height: 7, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: palette.textMuted, transform: [{ rotate: side === "right" ? "45deg" : "-135deg" }] }} />
    </View>
  );
}

/**
 * The screens of the active destination as a tab list (`role=tablist`): 44 px targets, visible focus, horizontal scroll
 * on narrow screens, Left/Right/Home/End move the focus. Selecting a tab navigates to its route. When the list overflows,
 * a fade shows on the side that has more, and the active tab is brought into view.
 */
function SectionTabs({ tabs, current, onNavigate, inset }: { readonly tabs: readonly NavTab[]; readonly current?: string; readonly onNavigate?: (href: string) => void; readonly inset: boolean }): ReactNode {
  const s = useThemedStyles(createShellStyles);
  const palette = useColors();
  const tabRing = ring(palette.primary);
  const t = useT();
  const refs = useRef<(View | null)[]>([]);
  const scroller = useRef<ScrollView>(null);
  const spans = useRef<{ x: number; w: number }[]>([]);
  const [metrics, setMetrics] = useState({ x: 0, view: 0, content: 0 });
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === current));
  const ground = palette.canvas;
  const hidden = metrics.content - metrics.view; // px outside the viewport
  const moreLeft = metrics.x >= EDGE_SLACK;
  const moreRight = hidden - metrics.x >= EDGE_SLACK;
  const reveal = (): void => {
    const span = spans.current[activeIndex];
    if (!span || metrics.view === 0) return;
    const pad = FADE_WIDTH + 8;
    if (span.x < metrics.x + pad) scroller.current?.scrollTo({ x: Math.max(0, span.x - pad), animated: false });
    else if (span.x + span.w > metrics.x + metrics.view - pad) scroller.current?.scrollTo({ x: span.x + span.w - metrics.view + pad, animated: false });
  };
  // Only when the active tab or the width changes: scrolling by hand must not fight this.
  useEffect(reveal, [activeIndex, metrics.view, metrics.content]);
  const onKey = (event: { key: string; preventDefault: () => void }, index: number): void => {
    const last = tabs.length - 1;
    const next = event.key === "ArrowRight" ? (index === last ? 0 : index + 1) : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : event.key === "Home" ? 0 : event.key === "End" ? last : -1;
    if (next < 0) return;
    event.preventDefault();
    refs.current[next]?.focus();
  };
  return (
    <View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(event) => { const x = event.nativeEvent.contentOffset.x; setMetrics((m) => (Math.abs(m.x - x) < 2 ? m : { ...m, x })); }}
        onLayout={(event: LayoutChangeEvent) => { const view = event.nativeEvent.layout.width; setMetrics((m) => (m.view === view ? m : { ...m, view })); }}
        onContentSizeChange={(content) => setMetrics((m) => (m.content === content ? m : { ...m, content }))}
        contentContainerStyle={inset ? s.mTabsRow : undefined}
      >
        <View role="tablist" aria-label={t("host.tabs.label")} style={s.tabs}>
          {tabs.map((tab, index) => {
            const active = index === activeIndex;
            const box = [s.sectionTab, active && s.sectionTabActive];
            const text = [s.sectionTabText, active && s.sectionTabTextActive];
            return (
              <Pressable key={tab.key} ref={(node) => { refs.current[index] = node; }} onLayout={(event) => { const { x, width } = event.nativeEvent.layout; spans.current[index] = { x, w: width }; }} role="tab" aria-selected={active} aria-current={active ? "page" : undefined} onPress={() => onNavigate?.(tab.href)} {...({ onKeyDown: (event: { key: string; preventDefault: () => void }) => onKey(event, index) } as object)} style={[...box, tabRing]}>
                <Text numberOfLines={1} style={text}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {moreLeft ? <EdgeFade side="left" color={ground} /> : null}
      {moreRight ? <EdgeFade side="right" color={ground} /> : null}
    </View>
  );
}

/** System · Light · Dark in one compact row (the full form, with its explanation, lives in Settings). */
function ThemeSwitch(): ReactNode {
  const t = useT();
  const s = useThemedStyles(createShellStyles);
  const surfaceRing = ring(useColors().primary);
  const { preference, setPreference, options } = useThemePreference();
  return (
    <View role="radiogroup" aria-label={t("theme.label")} style={s.themeRow}>
      {options.map((option) => {
        const on = option === preference;
        return (
          <Pressable key={option} role="radio" aria-checked={on} accessibilityLabel={t(`theme.${option}`)} testID={`theme-switch-${option}`} onPress={() => setPreference(option)} style={[s.themeOption, on && s.themeOptionOn, surfaceRing]}>
            <Text numberOfLines={1} style={[s.themeText, on && s.themeTextOn]}>{t(`theme.${option}`)}</Text>
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
  const palette = useColors();
  const ringColor = ring(palette.primary);
  return (
    <View style={s.sidebar}>
      <View style={s.sidebarLogo}><Logo tone="auto" height={28} /></View>
      <ScrollView role="navigation" aria-label={t("host.nav.label")} style={s.sidebarList}>
        {nav.map((item) => {
          const active = isCurrentDestination(item, current);
          return (
            <Pressable key={item.key} role="link" aria-current={active ? "page" : undefined} onPress={() => onNavigate?.(item.href)} style={[s.sidebarItem, active && s.sidebarItemActive, ringColor]}>
              <NavIcon name={item.key} size={20} color={active ? palette.text : palette.textMuted} />
              <Text style={[s.sidebarText, active && s.sidebarTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ marginTop: spacing[2] }}><ThemeSwitch /></View>
      {auth.state.status === "authenticated" ? (
        <Pressable role="button" accessibilityLabel={t("common.signOut")} onPress={() => { void auth.signOut(); }} style={[s.signOut, ringColor]}>
          <Text style={s.sidebarText}>{t("common.signOut")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MobileFrame({ nav, current, onNavigate, children }: PropsWithChildren<{ readonly nav: readonly NavItem[]; readonly current?: string; readonly onNavigate?: (href: string) => void }>): ReactNode {
  const s = useThemedStyles(createShellStyles);
  const palette = useColors();
  const tabRing = ring(palette.primary);
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
      <View style={s.topBar}>
        <Logo tone="auto" height={24} />
      </View>
      {children}
      {nav.length ? (
        <View role="navigation" aria-label={t("host.nav.label")} style={s.tabBar}>
          {tabs.map((item) => {
            const active = isCurrentDestination(item, current);
            return (
              <PressFeedback key={item.key} accessibilityRole="link" aria-current={active ? "page" : undefined} onPress={() => go(item.href)} style={[s.tab, tabRing]}>
                <View style={s.tabInner}>
                  <View style={[s.tabDot, active && s.tabDotActive]} />
                  <NavIcon name={item.key} size={22} color={active ? palette.text : palette.textMuted} />
                  <Text numberOfLines={1} style={[s.tabText, active && s.tabTextActive]}>{item.label}</Text>
                </View>
              </PressFeedback>
            );
          })}
          {overflow || signedIn ? (
            <PressFeedback accessibilityRole="button" aria-expanded={open} accessibilityLabel={t("common.more")} onPress={() => setOpen(true)} style={[s.tab, tabRing]}>
              <View style={s.tabInner}>
                <View style={[s.tabDot, hiddenActive && s.tabDotActive]} />
                <NavIcon name="more" size={22} color={hiddenActive ? palette.text : palette.textMuted} />
                <Text style={[s.tabText, hiddenActive && s.tabTextActive]}>{t("common.more")}</Text>
              </View>
            </PressFeedback>
          ) : null}
        </View>
      ) : null}
      <Modal visible={open} transparent animationType={overlayAnimation("slide")} onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel={t("common.close")} style={s.overlay} onPress={() => setOpen(false)}>
          <OverlayEnter from="down"><Pressable accessibilityViewIsModal style={s.sheet} onPress={(event) => event.stopPropagation()}>
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
          </Pressable></OverlayEnter>
        </Pressable>
      </Modal>
    </>
  );
}

/** Focused flows without sections (onboarding, access denied): the logo and sign-out, nothing else. */
function BareFrame({ children }: PropsWithChildren): ReactNode {
  const s = useThemedStyles(createShellStyles);
  const palette = useColors();
  const t = useT();
  const auth = useAuth();
  return (
    <>
      <View style={s.topBar}>
        <Logo tone="auto" height={24} />
        {auth.state.status === "authenticated" ? (
          <Pressable role="button" accessibilityLabel={t("common.signOut")} onPress={() => { void auth.signOut(); }} style={[{ minHeight: MIN_TOUCH, justifyContent: "center" }, ring(palette.primary)]}>
            <Text style={s.sidebarText}>{t("common.signOut")}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </>
  );
}

/**
 * `intro` is the optional warm line under the title (`PageIntro`). The tab bar of the active destination appears
 * under the title when `nav` has one with two or more tabs; a screen never builds its own.
 * `actions` is the screen's single primary action (one button) and `menu` its secondary actions (`OverflowMenu`).
 * From 768 px both sit at the right of the header, aligned with the title (`menu` then `actions`). Below 768 px
 * `menu` stays at the top right and `actions` moves to a `StickyActions` bar at the foot of the content.
 * `status` is the one line that says where the work stands (see the prop).
 */
export function Screen({ title, intro, nav, current, onNavigate, actions, menu, status, children }: PropsWithChildren<{ readonly title: string; readonly intro?: string; readonly nav?: readonly NavItem[]; readonly current?: string; readonly onNavigate?: (href: string) => void; readonly actions?: ReactNode; readonly menu?: ReactNode; /** One short line about the work in progress ("unsaved changes", "saved"). Sits above the sticky action bar below 768 px and at the top of the content from 768 px. */ readonly status?: ReactNode }>): ReactNode {
  const s = useThemedStyles(createShellStyles);
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const items = nav ?? [];
  const destination = items.find((item) => isCurrentDestination(item, current));
  const sectionTabs = destination?.tabs;
  // A change of destination fades in with a short rise, sibling tabs only fade; scroll returns to the top and focus goes to the h1 (docs/design/motion.md).
  const actionsInHeader = width >= ACTIONS_IN_HEADER;
  const content = <ScreenTransition routeKey={current ?? title} groupKey={destination?.key}>{status && actionsInHeader ? status : null}{children}</ScreenTransition>;
  const headerActions = menu || (actions && actionsInHeader) ? <View style={s.headActions}>{menu}{actionsInHeader ? actions : null}</View> : null;
  const stickyActions = actions && !actionsInHeader ? <StickyActions testID="screen-sticky-actions" {...(status ? { summary: status } : {})}>{actions}</StickyActions> : null;
  const tabs = sectionTabs && sectionTabs.length > 1 ? sectionTabs : undefined;
  if (wide) {
    const main = (
      <View style={s.scroll}>
        <View style={s.band}>
          <View style={[s.bandInner, s.headRow]}>
            <View style={s.headText}>
              <Text accessibilityRole="header" aria-level={1} style={s.title}>{title}</Text>
              {intro ? <PageIntro>{intro}</PageIntro> : null}
            </View>
            {headerActions}
          </View>
          {tabs ? <View style={s.bandTabs}><SectionTabs tabs={tabs} current={current} onNavigate={onNavigate} inset={false} /></View> : null}
        </View>
        <ScrollView role="main" tabIndex={0} style={s.scroll} contentContainerStyle={[s.content, s.contentWide]} keyboardShouldPersistTaps="handled">{content}</ScrollView>
      </View>
    );
    if (items.length === 0) return <View style={s.root}><BareFrame>{main}</BareFrame></View>;
    return <View style={[s.root, s.rootWide]}><Sidebar nav={items} current={current} onNavigate={onNavigate} />{main}</View>;
  }
  const body = (
    <ScrollView role="main" tabIndex={0} style={s.scroll} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={s.mHeader}>
        <View style={s.headRow}>
          <View style={s.headText}>
            <Text accessibilityRole="header" aria-level={1} style={s.mTitle}>{title}</Text>
            {intro ? <PageIntro>{intro}</PageIntro> : null}
          </View>
          {headerActions}
        </View>
        {tabs ? <View style={s.mTabs}><SectionTabs tabs={tabs} current={current} onNavigate={onNavigate} inset /></View> : null}
      </View>
      <View style={s.mSheet}>{content}{stickyActions}</View>
    </ScrollView>
  );
  if (items.length === 0) return <View style={s.root}><BareFrame>{body}</BareFrame></View>;
  return <View style={s.root}><MobileFrame nav={items} current={current} onNavigate={onNavigate}>{body}</MobileFrame></View>;
}
