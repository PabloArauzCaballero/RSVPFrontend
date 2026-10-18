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
const BASE_HEADING = 28;
const BASE_TITLE = 22;
const CENTER = "center";

function useStyles(scheme: ColorScheme): { readonly page: ViewStyle; readonly section: ViewStyle; readonly heading: TextStyle; readonly title: TextStyle; readonly body: TextStyle; readonly muted: TextStyle; readonly accent: TextStyle } {
  const { theme, layout } = useCelebrationTheme();
  const palette = paletteFor(theme, scheme);
  const align: TextStyle["textAlign"] = layout.align === CENTER ? "center" : "left";
  const cards = theme.sectionStyle === "cards";
  return StyleSheet.create({
    page: { backgroundColor: palette.canvas, padding: SPACE, gap: layout.sectionGap / 2 },
    section: { gap: SPACE / 2, padding: cards ? SPACE : 0, borderRadius: layout.radius, backgroundColor: cards ? palette.surface : "transparent" },
    heading: { color: palette.text, fontFamily: theme.typography.heading, fontSize: BASE_HEADING * layout.headingScale, textAlign: align, textTransform: layout.headingCase === "uppercase" ? "uppercase" : "none" },
    title: { color: palette.accent, fontFamily: theme.typography.heading, fontSize: BASE_TITLE * layout.headingScale, textAlign: align },
    body: { color: palette.text, fontFamily: theme.typography.body, textAlign: align },
    muted: { color: palette.muted, fontFamily: theme.typography.body, textAlign: align },
    accent: { color: palette.accent, fontWeight: "700", fontFamily: theme.typography.body }
  });
}

type NativeSection = (props: { readonly content: CelebrationContent; readonly gallery: readonly GalleryImage[]; readonly view: PublicCelebrationView; readonly t: Translate; readonly scheme: ColorScheme }) => ReactNode;

const NativeSections: Readonly<Record<SectionId, NativeSection>> = {
  story: ({ content, scheme }) => { const s = useStyles(scheme); return content.story.split("\n\n").filter(Boolean).map((paragraph) => <Text key={paragraph.slice(0, 32)} style={s.body}>{paragraph}</Text>); },
  schedule: ({ content, view, scheme }) => { const s = useStyles(scheme); return content.schedule.map((item) => <View key={item.id} style={{ flexDirection: "row", gap: SPACE }}><Text style={s.accent}>{formatTime(item.startsAt, view.timeZone, view.locale)}</Text><Text style={[s.body, { flex: 1 }]}>{item.title}</Text></View>); },
  venues: ({ content, t, scheme }) => { const s = useStyles(scheme); const venues = content.venues.length ? content.venues : [{ key: "main", kind: "other" as const, name: content.venueName }]; return venues.map((venue) => <View key={venue.key}><Text style={s.muted}>{t(`celebration.venues.kind.${venue.kind}`)}</Text><Text style={s.body}>{venue.name}</Text></View>); },
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
  return (
    <View style={s.page} accessibilityLabel={content.title}>
      <View style={{ gap: SPACE / 2 }}>
        <Text style={s.muted}>{props.view.eventType.name}</Text>
        <Text accessibilityRole="header" style={s.heading}>{content.title}</Text>
        {content.hosts.length ? <Text style={s.body}>{content.hosts.map((host) => host.name).join(" & ")}</Text> : null}
        {content.eventDate ? <Text style={s.body}>{formatDate(content.eventDate, props.view.timeZone, props.view.locale)}</Text> : null}
        {days !== null ? <Text style={s.muted}>{props.t(days ? "celebration.hero.countdown" : "celebration.hero.today", { count: days })}</Text> : null}
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
