import { useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import { daysUntil, hasSectionContent, navigationHref, readContent, SECTION_PATHS, shownVenues, type CelebrationContent, type GalleryImage, type PublicCelebrationView } from "./content.js";
import { formatDate, formatTime, zoneLabel } from "./format.js";
import { CelebrationThemeProvider, useCelebrationTheme } from "./theme-context.js";
import { accentFill, paletteFor, type ColorScheme } from "./theme.js";
import type { CelebrationTheme, SectionId, Translate } from "./types.js";

/**
 * React Native renderer: same theme data, same layout specs, same section order as the web
 * renderer; the palette travels by context instead of CSS variables (REQ-F09-04).
 * With `actions` it is the guest's invitation in the app, the mirror of the public page: section navigation, the cover
 * photo, "how to get there", full-size photos and partner recommendations. Without them it is a still preview.
 */

/** What the guest can do from the invitation. The host decides URLs; the app decides how a URL opens. */
export interface NativeRendererActions {
  /** Opens a URL outside the app: a maps link or a full-size photo. */
  readonly openUrl: (url: string) => void;
  /** Absolute URL of the partner redirector for a listing (every partner link goes through it); null hides a listing the app cannot link. */
  readonly partnerUrl: (listingId: string) => string | null;
  /** Moves to a section's own page, or back to the cover with null. */
  readonly openSection: (section: SectionId | null) => void;
}

export interface NativeRendererProps {
  readonly theme: CelebrationTheme;
  readonly view: PublicCelebrationView;
  readonly gallery?: readonly GalleryImage[];
  readonly t: Translate;
  readonly now?: Date;
  readonly colorScheme?: ColorScheme;
  /** Render only this section (its own page): the cover gives way to a compact header, as on the web. */
  readonly only?: SectionId;
  readonly actions?: NativeRendererActions;
}

const SPACE = 16;
const GALLERY_THUMB = 96;
const BASE_HEADING = 34;
const BASE_TITLE = 22;
const CENTER = "center";
const HAIRLINE = 1;
const DOT = 8;
const TIME_COLUMN = 64;
const RULE_WIDTH = 56;
const FRAME_GAP = 6;
const PILL = 999;
const ON_PHOTO = "#FFFFFF";
/** The shade over an overlay cover photo: the web darkens it to half brightness. */
const PHOTO_SHADE = "rgba(0,0,0,0.5)";
const COVER_MIN_HEIGHT = 320;
const COVER_MAX_HEIGHT = 352;
const TOUCH = 44;
const GALLERY_COLUMNS = 3;

type Styles = {
  readonly page: ViewStyle; readonly cover: ViewStyle; readonly coverInner: ViewStyle; readonly section: ViewStyle; readonly eyebrow: TextStyle; readonly heading: TextStyle; readonly hosts: TextStyle;
  readonly date: TextStyle; readonly title: TextStyle; readonly body: TextStyle; readonly muted: TextStyle; readonly accent: TextStyle; readonly rule: ViewStyle; readonly pill: ViewStyle; readonly pillText: TextStyle;
  readonly card: ViewStyle; readonly time: TextStyle; readonly dot: ViewStyle; readonly thread: ViewStyle; readonly coverInk: string; readonly coverAccent: string;
  readonly link: TextStyle; readonly nav: ViewStyle; readonly navItem: ViewStyle; readonly navText: TextStyle; readonly navCurrent: TextStyle; readonly note: TextStyle; readonly faqRow: ViewStyle; readonly coverPhoto: ImageStyle;
};

/**
 * Everything a layout decides, as styles. The cover follows `layout.hero` exactly like the web stylesheet: a framed card
 * (centered), a band of the accent colour (overlay, banner), a bar (split) or plain air (compact).
 */
function useStyles(scheme: ColorScheme): Styles {
  const { theme, layout } = useCelebrationTheme();
  const palette = paletteFor(theme, scheme);
  const centered = layout.align === CENTER;
  const align: TextStyle["textAlign"] = centered ? "center" : "left";
  const cards = theme.sectionStyle === "cards";
  const band = layout.hero === "overlay" || layout.hero === "banner";
  const fill = accentFill(theme, scheme);
  const coverInk = band ? (layout.hero === "overlay" ? ON_PHOTO : fill.ink) : palette.text;
  const coverAccent = band ? coverInk : palette.accent;
  const upper: TextStyle["textTransform"] = layout.headingCase === "uppercase" ? "uppercase" : "none";
  return {
    coverInk, coverAccent,
    ...StyleSheet.create({
      page: { backgroundColor: palette.canvas, gap: layout.sectionGap / 2, paddingBottom: SPACE * 2 },
      cover: { padding: SPACE, paddingVertical: SPACE * 2, backgroundColor: band ? fill.fill : "transparent", borderBottomLeftRadius: layout.hero === "banner" ? layout.radius : 0, borderBottomRightRadius: layout.hero === "banner" ? layout.radius : 0 },
      coverInner: {
        gap: SPACE / 2, alignItems: centered ? "center" : "flex-start",
        ...(layout.hero === "centered" ? { padding: SPACE * 1.5, margin: FRAME_GAP, borderWidth: HAIRLINE, borderColor: palette.accent, backgroundColor: palette.surface } : {}),
        ...(layout.hero === "split" ? { paddingLeft: SPACE, borderLeftWidth: FRAME_GAP, borderLeftColor: palette.accent } : {})
      },
      section: { gap: SPACE / 2, marginHorizontal: SPACE, padding: cards ? SPACE : 0, borderRadius: layout.radius, backgroundColor: cards ? palette.surface : "transparent" },
      eyebrow: { color: coverAccent, fontFamily: theme.typography.body, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", textAlign: align },
      heading: { color: coverInk, fontFamily: theme.typography.heading, fontSize: BASE_HEADING * layout.headingScale, lineHeight: BASE_HEADING * layout.headingScale * 1.08, textAlign: align, textTransform: upper },
      hosts: { color: coverInk, fontFamily: theme.typography.heading, fontSize: 18, textAlign: align },
      date: { color: coverInk, fontFamily: theme.typography.heading, fontSize: 18, letterSpacing: 0.5, textAlign: align },
      title: { color: palette.accent, fontFamily: theme.typography.heading, fontSize: BASE_TITLE * layout.headingScale, textAlign: align, textTransform: upper },
      body: { color: palette.text, fontFamily: theme.typography.body, textAlign: align },
      muted: { color: band ? coverInk : palette.muted, fontFamily: theme.typography.body, textAlign: align },
      accent: { color: palette.accent, fontWeight: "700", fontFamily: theme.typography.body },
      rule: { width: layout.divider === "none" ? RULE_WIDTH * 2 : RULE_WIDTH, height: layout.divider === "ornament" ? HAIRLINE : 2, backgroundColor: coverAccent, marginVertical: SPACE / 2 },
      pill: { marginTop: SPACE / 2, paddingHorizontal: SPACE, paddingVertical: 4, borderRadius: PILL, borderWidth: HAIRLINE, borderColor: band ? coverInk : palette.muted },
      pillText: { color: band ? coverInk : palette.muted, fontFamily: theme.typography.body, fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" },
      card: { gap: 2, padding: SPACE, borderWidth: HAIRLINE, borderColor: palette.muted, borderRadius: Math.max(layout.radius, 2), backgroundColor: palette.surface },
      time: { width: TIME_COLUMN, color: palette.accent, fontFamily: theme.typography.heading, fontWeight: "700", fontSize: 16, textAlign: "right" },
      dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: palette.accent, marginTop: 6 },
      thread: { position: "absolute", left: TIME_COLUMN + SPACE + DOT / 2 - HAIRLINE / 2, top: 0, bottom: 0, width: HAIRLINE, backgroundColor: palette.muted, opacity: 0.4 },
      link: { color: palette.accent, fontFamily: theme.typography.body, fontWeight: "600", textDecorationLine: "underline", minHeight: TOUCH, paddingVertical: SPACE / 2, textAlign: align },
      nav: { flexDirection: "row", gap: SPACE, paddingHorizontal: SPACE, justifyContent: centered ? "center" : "flex-start", borderTopWidth: HAIRLINE, borderBottomWidth: HAIRLINE, borderColor: palette.muted },
      navItem: { minHeight: TOUCH, justifyContent: "center" },
      navText: { color: palette.text, fontFamily: theme.typography.body },
      navCurrent: { color: palette.accent, fontWeight: "700", textDecorationLine: "underline" },
      note: { color: palette.muted, fontFamily: theme.typography.body, fontSize: 13, textAlign: align, marginTop: SPACE / 2 },
      faqRow: { minHeight: TOUCH, justifyContent: "center", paddingVertical: SPACE / 2, borderBottomWidth: HAIRLINE, borderColor: palette.muted },
      coverPhoto: { borderRadius: layout.hero === "overlay" ? 0 : layout.radius }
    })
  };
}

type NativeSectionProps = { readonly content: CelebrationContent; readonly gallery: readonly GalleryImage[]; readonly view: PublicCelebrationView; readonly t: Translate; readonly scheme: ColorScheme; readonly actions?: NativeRendererActions };
type NativeSection = (props: NativeSectionProps) => ReactNode;

/** A text link of the invitation: underlined in the accent colour, 44 pt tall, announced as a link. */
function TextLink({ label, onPress, scheme, hint }: { readonly label: string; readonly onPress: () => void; readonly scheme: ColorScheme; readonly hint?: string }): ReactNode {
  const s = useStyles(scheme);
  return <Pressable accessibilityRole="link" accessibilityHint={hint} onPress={onPress} style={s.navItem}><Text style={s.link}>{label}</Text></Pressable>;
}

/** A question that opens to its answer, like `<details>` on the web: closed by default, its state announced. */
function FaqItem({ question, answer, scheme }: { readonly question: string; readonly answer: string; readonly scheme: ColorScheme }): ReactNode {
  const s = useStyles(scheme);
  const [open, setOpen] = useState(false);
  return (
    <View style={s.faqRow}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(!open)} style={s.navItem}>
        <Text style={[s.body, { fontWeight: "600", textAlign: "left" }]}>{question}</Text>
      </Pressable>
      {open ? <Text style={[s.body, { textAlign: "left" }]}>{answer}</Text> : null}
    </View>
  );
}

function Gallery({ gallery, t, actions }: NativeSectionProps): ReactNode {
  const [width, setWidth] = useState(0);
  const side = width ? Math.floor((width - SPACE / 2 * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS) : GALLERY_THUMB;
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE / 2 }}>
      {gallery.map((image, index) => {
        const label = t("celebration.gallery.photo", { n: index + 1, total: gallery.length });
        const photo = <Image source={{ uri: image.variants.medium ?? image.variants.thumb ?? image.variants.webp }} style={{ width: side, height: side }} accessibilityLabel={label} accessibilityIgnoresInvertColors />;
        const full = image.variants.full ?? image.variants.webp;
        return actions && full
          ? <Pressable key={image.id} accessibilityRole="link" accessibilityLabel={t("celebration.gallery.open", { label })} onPress={() => actions.openUrl(full)}>{photo}</Pressable>
          : <View key={image.id}>{photo}</View>;
      })}
    </View>
  );
}

const NativeSections: Readonly<Record<SectionId, NativeSection>> = {
  story: ({ content, scheme }) => { const s = useStyles(scheme); return content.story.split("\n\n").filter(Boolean).map((paragraph) => <Text key={paragraph.slice(0, 32)} style={s.body}>{paragraph}</Text>); },
  schedule: ({ content, view, t, scheme }) => {
    const s = useStyles(scheme);
    return (
      <View>
        {content.schedule.length > 1 ? <View style={s.thread} /> : null}
        {content.schedule.map((item) => (
          <View key={item.id} style={{ flexDirection: "row", gap: SPACE, paddingVertical: SPACE / 2 }}>
            <Text style={s.time}>{formatTime(item.startsAt, view.timeZone, view.locale)}</Text>
            <View style={s.dot} />
            <View style={{ flex: 1 }}><Text style={[s.body, { textAlign: "left", fontWeight: "600" }]}>{item.title}</Text>{item.description ? <Text style={[s.muted, { textAlign: "left" }]}>{item.description}</Text> : null}</View>
          </View>
        ))}
        {content.schedule[0] ? <Text style={s.note}>{t("celebration.schedule.zoneNote", { zone: zoneLabel(content.schedule[0].startsAt, view.timeZone, view.locale), timeZone: view.timeZone })}</Text> : null}
      </View>
    );
  },
  venues: ({ content, t, scheme, actions }) => {
    const s = useStyles(scheme);
    return (
      <View style={{ gap: SPACE / 2 }}>
        {shownVenues(content).map((venue) => (
          <View key={venue.key} style={s.card}>
            <Text style={[s.eyebrow, { color: s.accent.color }]}>{t(`celebration.venues.kind.${venue.kind}`)}</Text>
            <Text style={[s.body, { fontFamily: s.title.fontFamily, fontSize: 18 }]}>{venue.name}</Text>
            {venue.address ? <Text style={s.muted}>{venue.address}</Text> : null}
            {actions ? <TextLink label={t("celebration.venues.howToGetThere")} hint={venue.name} onPress={() => actions.openUrl(navigationHref(venue))} scheme={scheme} /> : null}
          </View>
        ))}
      </View>
    );
  },
  gallery: Gallery,
  dressCode: ({ content, scheme }) => { const s = useStyles(scheme); return <Text style={s.body}>{content.dressCode}</Text>; },
  faq: ({ content, scheme }) => content.faq.map((item) => <FaqItem key={item.question} question={item.question} answer={item.answer} scheme={scheme} />),
  recommendations: ({ content, t, scheme, actions }) => {
    const s = useStyles(scheme);
    return content.recommendations.map((item) => {
      const partner = actions && item.listingId ? actions.partnerUrl(item.listingId) : null;
      return (
        <View key={`${item.kind}-${item.name}`} style={s.card}>
          <Text style={[s.eyebrow, { color: s.accent.color }]}>{t(`celebration.recommendations.kind.${item.kind}`)}</Text>
          <Text style={[s.body, { fontWeight: "600" }]}>{item.name}</Text>
          {item.description ? <Text style={s.muted}>{item.description}</Text> : null}
          {actions && partner ? <TextLink label={t("celebration.recommendations.view")} hint={item.name} onPress={() => actions.openUrl(partner)} scheme={scheme} /> : null}
        </View>
      );
    });
  },
  gifts: () => null,
  rsvp: ({ t, scheme }) => { const s = useStyles(scheme); return <Text style={s.muted}>{t("celebration.rsvp.body")}</Text>; }
};

/** The cover photo, placed as the layout places it on the web: behind the copy (overlay), before it, or after it (banner). */
function CoverPhoto({ image, scheme }: { readonly image: GalleryImage; readonly scheme: ColorScheme }): ReactNode {
  const s = useStyles(scheme);
  const { layout } = useCelebrationTheme();
  const uri = image.variants.full ?? image.variants.medium ?? image.variants.webp;
  if (!uri) return null;
  const ratio = image.width && image.height ? image.width / image.height : 4 / 3;
  if (layout.hero === "overlay") {
    return (
      <View style={StyleSheet.absoluteFill} testID="celebration-cover-photo">
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: PHOTO_SHADE }]} />
      </View>
    );
  }
  return <FramedCoverPhoto uri={uri} ratio={ratio} style={s.coverPhoto} />;
}

/**
 * Height of a cover photo shown `width` wide: its own proportion (never taller than 3:4) capped at the cover's maximum, as the
 * web's `width: 100%; max-height` does. Computed rather than left to `aspectRatio` + `maxHeight`: on iOS/Android Yoga
 * honours the cap by shrinking the WIDTH to keep the ratio, so the photo came out narrow and left-aligned.
 */
export function coverPhotoHeight(width: number, ratio: number): number {
  return Math.round(Math.min(width / Math.max(ratio, 3 / 4), COVER_MAX_HEIGHT));
}

function FramedCoverPhoto({ uri, ratio, style }: { readonly uri: string; readonly ratio: number; readonly style: ImageStyle }): ReactNode {
  const [width, setWidth] = useState(0);
  return (
    <View testID="celebration-cover-photo" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ width: "100%", height: width ? coverPhotoHeight(width, ratio) : COVER_MAX_HEIGHT, overflow: "hidden", borderRadius: style.borderRadius }}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

function SectionNav({ sections, only, t, scheme, actions }: { readonly sections: readonly SectionId[]; readonly only?: SectionId; readonly t: Translate; readonly scheme: ColorScheme; readonly actions?: NativeRendererActions }): ReactNode {
  const s = useStyles(scheme);
  const linked = sections.filter((section) => SECTION_PATHS[section]);
  if (!actions || !linked.length) return null;
  const items: readonly { readonly key: SectionId | null; readonly label: string }[] = [{ key: null, label: t("celebration.nav.home") }, ...linked.map((section) => ({ key: section, label: t(`celebration.sections.${section}`) }))];
  return (
    <View role="navigation" aria-label={t("celebration.nav.label")} testID="celebration-nav">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.nav, { flexGrow: 1 }]}>
        {items.map((item) => {
          const current = (item.key ?? undefined) === only;
          return (
            <Pressable key={item.key ?? "home"} accessibilityRole="link" aria-current={current ? "page" : undefined} accessibilityState={{ selected: current }} onPress={() => actions.openSection(item.key)} style={s.navItem}>
              <Text style={[s.navText, current ? s.navCurrent : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Cover(props: NativeRendererProps & { readonly scheme: ColorScheme; readonly content: CelebrationContent; readonly cover?: GalleryImage }): ReactNode {
  const s = useStyles(props.scheme);
  const { layout } = useCelebrationTheme();
  const { content } = props;
  if (props.only) {
    return (
      <View style={s.cover} testID="celebration-cover">
        <View style={s.coverInner}>
          <Text style={s.eyebrow}>{content.title}</Text>
          <Text accessibilityRole="header" aria-level={1} style={s.heading}>{props.t(`celebration.sections.${props.only}`)}</Text>
        </View>
      </View>
    );
  }
  const days = daysUntil(content.eventDate, props.now ?? new Date());
  // A title made of the hosts' names already says who: repeating them underneath is noise.
  const hostsInTitle = content.hosts.length > 0 && content.hosts.every((host) => content.title.includes(host.name));
  const photo = props.cover && layout.hero !== "compact" ? <CoverPhoto image={props.cover} scheme={props.scheme} /> : null;
  const overlay = layout.hero === "overlay" && photo;
  return (
    <View style={[s.cover, overlay ? { minHeight: COVER_MIN_HEIGHT, justifyContent: "center", overflow: "hidden" } : null]} testID="celebration-cover">
      {photo && layout.hero !== "banner" ? photo : null}
      <View style={[s.coverInner, photo && !overlay && layout.hero !== "banner" ? { marginTop: SPACE } : null]}>
        <Text style={s.eyebrow}>{props.view.eventType.name}</Text>
        <Text accessibilityRole="header" aria-level={1} style={s.heading}>{content.title}</Text>
        {content.hosts.length && !hostsInTitle ? <Text style={s.hosts}>{content.hosts.map((host) => host.name).join(" & ")}</Text> : null}
        <View style={s.rule} />
        {content.eventDate ? <Text style={s.date}>{formatDate(content.eventDate, props.view.timeZone, props.view.locale)}</Text> : null}
        {content.venueName ? <Text style={s.muted}>{content.venueName}</Text> : null}
        {days !== null ? <View style={s.pill}><Text style={s.pillText}>{props.t(days ? "celebration.hero.countdown" : "celebration.hero.today", { count: days })}</Text></View> : null}
      </View>
      {photo && layout.hero === "banner" ? <View style={{ marginTop: SPACE }}>{photo}</View> : null}
    </View>
  );
}

function Page(props: NativeRendererProps): ReactNode {
  const scheme = props.colorScheme ?? "light";
  const s = useStyles(scheme);
  const { theme } = useCelebrationTheme();
  const gallery = props.gallery ?? [];
  const content = readContent(props.view);
  const available = theme.sections.filter((section) => hasSectionContent(section, content, gallery));
  const shown = props.only ? available.filter((section) => section === props.only) : available;
  const cover = gallery.find((image) => image.isCover);
  return (
    <View style={s.page} accessibilityLabel={content.title}>
      <Cover {...props} scheme={scheme} content={content} {...(cover ? { cover } : {})} />
      <SectionNav sections={available} {...(props.only ? { only: props.only } : {})} t={props.t} scheme={scheme} {...(props.actions ? { actions: props.actions } : {})} />
      {shown.map((section) => {
        const Body = NativeSections[section];
        return (
          <View key={section} style={s.section} testID={`section-${section}`}>
            {/* On a section's own page the header already names it. */}
            {props.only ? null : <Text accessibilityRole="header" aria-level={2} style={s.title}>{props.t(`celebration.sections.${section}`)}</Text>}
            <Body content={content} gallery={gallery} view={props.view} t={props.t} scheme={scheme} {...(props.actions ? { actions: props.actions } : {})} />
          </View>
        );
      })}
    </View>
  );
}

export function CelebrationNativeRenderer(props: NativeRendererProps): ReactNode {
  return <CelebrationThemeProvider theme={props.theme}><Page {...props} /></CelebrationThemeProvider>;
}
