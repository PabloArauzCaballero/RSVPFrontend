import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { daysUntil, hasSectionContent, readContent, type CelebrationContent, type GalleryImage, type PublicCelebrationView } from "./content.js";
import { formatDate, formatTime } from "./format.js";
import { CelebrationThemeProvider, useCelebrationTheme } from "./theme-context.js";
import { paletteFor, type ColorScheme } from "./theme.js";
import type { CelebrationTheme, SectionId, Translate } from "./types.js";

/**
 * React Native renderer: same theme data, same layout specs, same section order as the web
 * renderer; the palette travels by context instead of CSS variables (REQ-F09-04).
 */

export interface NativeRendererProps {
  readonly theme: CelebrationTheme;
  readonly view: PublicCelebrationView;
  readonly gallery?: readonly GalleryImage[];
  readonly t: Translate;
  readonly now?: Date;
  readonly colorScheme?: ColorScheme;
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

type Styles = {
  readonly page: ViewStyle; readonly cover: ViewStyle; readonly coverInner: ViewStyle; readonly section: ViewStyle; readonly eyebrow: TextStyle; readonly heading: TextStyle; readonly hosts: TextStyle;
  readonly date: TextStyle; readonly title: TextStyle; readonly body: TextStyle; readonly muted: TextStyle; readonly accent: TextStyle; readonly rule: ViewStyle; readonly pill: ViewStyle; readonly pillText: TextStyle;
  readonly card: ViewStyle; readonly time: TextStyle; readonly dot: ViewStyle; readonly thread: ViewStyle; readonly coverInk: string; readonly coverAccent: string;
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
  const coverInk = band ? (layout.hero === "overlay" ? ON_PHOTO : palette.surface) : palette.text;
  const coverAccent = band ? coverInk : palette.accent;
  const upper: TextStyle["textTransform"] = layout.headingCase === "uppercase" ? "uppercase" : "none";
  return {
    coverInk, coverAccent,
    ...StyleSheet.create({
      page: { backgroundColor: palette.canvas, gap: layout.sectionGap / 2, paddingBottom: SPACE * 2 },
      cover: { padding: SPACE, paddingVertical: SPACE * 2, backgroundColor: band ? palette.accent : "transparent", borderBottomLeftRadius: layout.hero === "banner" ? layout.radius : 0, borderBottomRightRadius: layout.hero === "banner" ? layout.radius : 0 },
      coverInner: {
        gap: SPACE / 2, alignItems: centered ? "center" : "flex-start",
        ...(layout.hero === "centered" ? { padding: SPACE * 1.5, margin: FRAME_GAP, borderWidth: HAIRLINE, borderColor: palette.accent, backgroundColor: palette.surface } : {}),
        ...(layout.hero === "split" ? { paddingLeft: SPACE, borderLeftWidth: FRAME_GAP, borderLeftColor: palette.accent } : {})
      },
      section: { gap: SPACE / 2, marginHorizontal: SPACE, padding: cards ? SPACE : 0, borderRadius: layout.radius, backgroundColor: cards ? palette.surface : "transparent" },
      eyebrow: { color: coverAccent, fontFamily: theme.typography.body, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", textAlign: align },
      heading: { color: coverInk, fontFamily: theme.typography.heading, fontSize: BASE_HEADING * layout.headingScale, lineHeight: BASE_HEADING * layout.headingScale * 1.08, textAlign: align, textTransform: upper },
      hosts: { color: coverInk, fontFamily: theme.typography.heading, fontSize: 18, textAlign: align },
      date: { color: coverInk, fontFamily: theme.typography.heading, fontSize: 18, letterSpacing: 0.5, textAlign: align },
      title: { color: palette.accent, fontFamily: theme.typography.heading, fontSize: BASE_TITLE * layout.headingScale, textAlign: align, textTransform: upper },
      body: { color: palette.text, fontFamily: theme.typography.body, textAlign: align },
      muted: { color: band ? coverInk : palette.muted, fontFamily: theme.typography.body, textAlign: align },
      accent: { color: palette.accent, fontWeight: "700", fontFamily: theme.typography.body },
      rule: { width: layout.divider === "none" ? RULE_WIDTH * 2 : RULE_WIDTH, height: layout.divider === "ornament" ? HAIRLINE : 2, backgroundColor: coverAccent, marginVertical: SPACE / 2 },
      pill: { marginTop: SPACE / 2, paddingHorizontal: SPACE, paddingVertical: 4, borderRadius: PILL, borderWidth: HAIRLINE, borderColor: band ? coverInk : palette.muted },
      pillText: { color: band ? coverInk : palette.muted, fontFamily: theme.typography.body, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
      card: { gap: 2, padding: SPACE, borderWidth: HAIRLINE, borderColor: palette.muted, borderRadius: Math.max(layout.radius, 2), backgroundColor: palette.surface },
      time: { width: TIME_COLUMN, color: palette.accent, fontFamily: theme.typography.heading, fontWeight: "700", fontSize: 16, textAlign: "right" },
      dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: palette.accent, marginTop: 6 },
      thread: { position: "absolute", left: TIME_COLUMN + SPACE + DOT / 2 - HAIRLINE / 2, top: 0, bottom: 0, width: HAIRLINE, backgroundColor: palette.muted, opacity: 0.4 }
    })
  };
}

type NativeSection = (props: { readonly content: CelebrationContent; readonly gallery: readonly GalleryImage[]; readonly view: PublicCelebrationView; readonly t: Translate; readonly scheme: ColorScheme }) => ReactNode;

const NativeSections: Readonly<Record<SectionId, NativeSection>> = {
  story: ({ content, scheme }) => { const s = useStyles(scheme); return content.story.split("\n\n").filter(Boolean).map((paragraph) => <Text key={paragraph.slice(0, 32)} style={s.body}>{paragraph}</Text>); },
  schedule: ({ content, view, scheme }) => {
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
      </View>
    );
  },
  venues: ({ content, t, scheme }) => {
    const s = useStyles(scheme);
    const venues = content.venues.length ? content.venues : [{ key: "main", kind: "other" as const, name: content.venueName }];
    return <View style={{ gap: SPACE / 2 }}>{venues.map((venue) => <View key={venue.key} style={s.card}><Text style={[s.eyebrow, { color: s.accent.color }]}>{t(`celebration.venues.kind.${venue.kind}`)}</Text><Text style={[s.body, { fontFamily: s.title.fontFamily, fontSize: 18 }]}>{venue.name}</Text>{"address" in venue && venue.address ? <Text style={s.muted}>{venue.address}</Text> : null}</View>)}</View>;
  },
  gallery: ({ gallery }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE / 2 }}>{gallery.map((image) => <Image key={image.id} source={{ uri: image.variants.thumb ?? image.variants.webp }} style={{ width: GALLERY_THUMB, height: GALLERY_THUMB }} accessibilityIgnoresInvertColors />)}</View>,
  dressCode: ({ content, scheme }) => { const s = useStyles(scheme); return <Text style={s.body}>{content.dressCode}</Text>; },
  faq: ({ content, scheme }) => { const s = useStyles(scheme); return content.faq.map((item) => <View key={item.question}><Text style={s.accent}>{item.question}</Text><Text style={s.body}>{item.answer}</Text></View>); },
  recommendations: ({ content, scheme }) => { const s = useStyles(scheme); return content.recommendations.map((item) => <Text key={`${item.kind}-${item.name}`} style={s.body}>{item.name}</Text>); },
  gifts: () => null,
  rsvp: ({ t, scheme }) => { const s = useStyles(scheme); return <Text style={s.muted}>{t("celebration.rsvp.body")}</Text>; }
};

function Page(props: NativeRendererProps): ReactNode {
  const scheme = props.colorScheme ?? "light";
  const s = useStyles(scheme);
  const { theme } = useCelebrationTheme();
  const gallery = props.gallery ?? [];
  const content = readContent(props.view);
  const days = daysUntil(content.eventDate, props.now ?? new Date());
  const sections = theme.sections.filter((section) => hasSectionContent(section, content, gallery));
  // A title made of the hosts' names already says who: repeating them underneath is noise.
  const hostsInTitle = content.hosts.length > 0 && content.hosts.every((host) => content.title.includes(host.name));
  return (
    <View style={s.page} accessibilityLabel={content.title}>
      <View style={s.cover} testID="celebration-cover">
        <View style={s.coverInner}>
          <Text style={s.eyebrow}>{props.view.eventType.name}</Text>
          <Text accessibilityRole="header" style={s.heading}>{content.title}</Text>
          {content.hosts.length && !hostsInTitle ? <Text style={s.hosts}>{content.hosts.map((host) => host.name).join(" & ")}</Text> : null}
          <View style={s.rule} />
          {content.eventDate ? <Text style={s.date}>{formatDate(content.eventDate, props.view.timeZone, props.view.locale)}</Text> : null}
          {content.venueName ? <Text style={[s.muted, { opacity: 0.85 }]}>{content.venueName}</Text> : null}
          {days !== null ? <View style={s.pill}><Text style={s.pillText}>{props.t(days ? "celebration.hero.countdown" : "celebration.hero.today", { count: days })}</Text></View> : null}
        </View>
      </View>
      {sections.map((section) => {
        const Body = NativeSections[section];
        return (
          <View key={section} style={s.section} testID={`section-${section}`}>
            <Text accessibilityRole="header" style={s.title}>{props.t(`celebration.sections.${section}`)}</Text>
            <Body content={content} gallery={gallery} view={props.view} t={props.t} scheme={scheme} />
          </View>
        );
      })}
    </View>
  );
}

export function CelebrationNativeRenderer(props: NativeRendererProps): ReactNode {
  return <CelebrationThemeProvider theme={props.theme}><Page {...props} /></CelebrationThemeProvider>;
}
