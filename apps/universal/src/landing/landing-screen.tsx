import { createElement, useState, type PropsWithChildren, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import {
  LANDING_COUNTS, LANDING_FAQ, LANDING_GIFTS, LANDING_GUEST_POINTS, LANDING_GUESTS, LANDING_PROOF, LANDING_PROVIDER_CHIPS, LANDING_PROVIDERS, LANDING_STATUS,
  LANDING_STEPS, LANDING_STYLES, LANDING_TYPES, type LandingSample, type LandingStyle, type LandingTone, type Translate
} from "@rsvp/i18n";
import { CheckMark, Enter, Logo, fonts, useColors, useTones } from "@rsvp/ui";
import { LanguageSwitch } from "../auth/auth-ui";
import { useT } from "../platform/providers";

/**
 * The public home (`/` without a session) in the app served on the web: the mirror of the public site's home
 * (apps/seo-web/components/landing.tsx). Same sections, same order, same copy keys and the same sample content
 * (`@rsvp/i18n` landing content): the promise, the three taps, who it is for, what is true and what is not, one way in.
 * On iOS and Android `/` keeps opening at sign-in (see `anonymous-home.tsx`), so this screen is web-only: its drawings are
 * inline SVG elements, the pattern of `packages/ui` for the web (react-native-svg lives only in `.native` files).
 */

type SvgProps = Readonly<Record<string, string | number | undefined | Readonly<Record<string, string>>>>;
const svg = (props: SvgProps, ...children: ReactNode[]): ReactNode => createElement("svg", { "aria-hidden": true, focusable: "false", ...props }, ...children);
const path = (d: string): ReactNode => createElement("path", { key: d, d });

export interface LandingProps { readonly onNavigate: (path: string) => void }

const COLUMN = 1152;
/** Invitation paper: the only colours outside the theme tokens, as on the web (they are the sample, not the interface). */
const PAPER = { paper: "#FCF9F2", ink: "#2B2620", gold: "#8C6B3F", muted: "#6E655A", line: "#E4DAC7", edge: "#CFC3AC" } as const;
const SHEETS: Readonly<Record<LandingStyle, { readonly paper: string; readonly ink: string; readonly gold: string; readonly italic?: boolean; readonly upper?: boolean; readonly sans?: boolean; readonly ctaGold?: boolean }>> = {
  classic: { paper: "#FBF7EE", ink: "#3A3226", gold: "#7A5A2E" },
  editorial: { paper: "#F1ECE4", ink: "#5B1A24", gold: "#5B1A24", upper: true, sans: true },
  garden: { paper: "#EDF2E8", ink: "#2C4733", gold: "#3F6A47", italic: true },
  rose: { paper: "#F9ECEA", ink: "#74404B", gold: "#9A4F5C", italic: true },
  minimal: { paper: "#F7F7F5", ink: "#0B0B0C", gold: "#70707A", sans: true },
  terracotta: { paper: "#F4E8DB", ink: "#3B2A20", gold: "#9C4521", ctaGold: true }
};
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

function useLayout() {
  const { width } = useWindowDimensions();
  return { wide: width >= 992, twoUp: width >= 960, three: width >= 832, narrow: width < 420 };
}

function Column({ children, style }: PropsWithChildren<{ readonly style?: ViewStyle }>): ReactNode {
  return <View style={[{ width: "100%", maxWidth: COLUMN, alignSelf: "center", paddingHorizontal: spacing[5] }, style]}>{children}</View>;
}

function Heading({ children, level = 2, size }: PropsWithChildren<{ readonly level?: 1 | 2 | 3; readonly size?: number }>): ReactNode {
  const palette = useColors();
  const base = size ?? (level === 1 ? 52 : level === 2 ? 36 : 21);
  return <Text accessibilityRole="header" aria-level={level} style={{ color: palette.text, fontFamily: fonts.display, fontSize: base, lineHeight: Math.round(base * 1.06), fontWeight: "600", letterSpacing: -base * 0.03 }}>{children}</Text>;
}

function Lead({ children, style }: PropsWithChildren<{ readonly style?: TextStyle }>): ReactNode {
  const palette = useColors();
  return <Text style={[{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 17, lineHeight: 26, maxWidth: 576 }, style]}>{children}</Text>;
}

function Link({ label, path, onNavigate, testID }: { readonly label: string; readonly path: string; readonly testID?: string } & LandingProps): ReactNode {
  const palette = useColors();
  return (
    <Pressable accessibilityRole="link" onPress={() => onNavigate(path)} testID={testID} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 16, fontWeight: "600", textDecorationLine: "underline" }}>{label}</Text>
    </Pressable>
  );
}

function Solid({ label, path, onNavigate, invert = false, testID }: { readonly label: string; readonly path: string; readonly invert?: boolean; readonly testID?: string } & LandingProps): ReactNode {
  const palette = useColors();
  return (
    <Pressable accessibilityRole="link" onPress={() => onNavigate(path)} testID={testID} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 26, borderRadius: radius.md, justifyContent: "center", alignSelf: "flex-start", backgroundColor: invert ? palette.onPrimary : palette.primary, opacity: pressed ? 0.85 : 1 })}>
      <Text style={{ color: invert ? palette.primary : palette.onPrimary, fontFamily: fonts.sans, fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function Tag({ tone, children }: PropsWithChildren<{ readonly tone: LandingTone }>): ReactNode {
  const tones = useTones();
  const { bg, fg } = tones[tone];
  return <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: bg, alignSelf: "center" }}><Text style={{ color: fg, fontFamily: fonts.sans, fontSize: 12, fontWeight: "600" }}>{children}</Text></View>;
}

/** The sprig of the sample invitations, in the ink of whatever it sits on. */
function Sprig({ color, width = 96 }: { readonly color: string; readonly width?: number }): ReactNode {
  return (
    svg({ width, height: width / 5, viewBox: "0 0 120 24", fill: "none", stroke: color, strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round" },
      path("M4 12h44M72 12h44"), path("M60 5c-4 3-4 11 0 14c4-3 4-11 0-14Z"), path("M52 12c-3-4-8-4-10-1c3 3 7 3 10 1ZM68 12c3-4 8-4 10-1c-3 3-7 3-10 1Z"))
  );
}

function Mono({ children, color, size = 10 }: PropsWithChildren<{ readonly color: string; readonly size?: number }>): ReactNode {
  return <Text style={{ fontFamily: fonts.mono, fontSize: size, letterSpacing: size * 0.2, textTransform: "uppercase", color, textAlign: "center" }}>{children}</Text>;
}

/** The invitation a guest opens, as it looks on their phone. */
function PhoneInvitation({ t }: { readonly t: Translate }): ReactNode {
  const palette = useColors();
  // The edge in the border token keeps the black phone visible on the dark canvas (the site's `0 0 0 1px var(--border)`).
  return (
    <View style={{ width: 260, maxWidth: "74%", aspectRatio: 9 / 18, padding: 10, borderRadius: 42, backgroundColor: "#0B0B0C", borderWidth: 1, borderColor: palette.border }}>
      <View style={{ flex: 1, borderRadius: 33, paddingTop: 34, paddingHorizontal: 18, paddingBottom: 18, backgroundColor: PAPER.paper, alignItems: "center", gap: 8 }}>
        <Mono color={PAPER.gold}>{t("landing.invitation.kicker")}</Mono>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 35, color: PAPER.ink }}>{t("landing.invitation.first")}</Text>
          <Text style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 20, color: PAPER.gold }}>&amp;</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 35, color: PAPER.ink }}>{t("landing.invitation.second")}</Text>
        </View>
        <Sprig color={PAPER.gold} />
        <Text style={{ fontFamily: SERIF, fontSize: 16, letterSpacing: 2, color: PAPER.ink }}>{t("landing.invitation.date")}</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: PAPER.muted }}>{t("landing.invitation.venue")}</Text>
        <View style={{ borderWidth: 1, borderColor: "#D9CDB6", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Mono color={PAPER.muted} size={9}>{t("landing.invitation.countdown")}</Mono></View>
        <View style={{ marginTop: "auto", alignSelf: "stretch", gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: PAPER.line }}>
          <Text style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, textAlign: "center", color: PAPER.ink }}>{t("landing.invitation.question")}</Text>
          <View style={{ minHeight: 38, borderRadius: 11, backgroundColor: PAPER.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <CheckMark size={18} /><Text style={{ color: PAPER.paper, fontFamily: fonts.sans, fontSize: 13, fontWeight: "600" }}>{t("landing.invitation.yes")}</Text>
          </View>
          <View style={{ minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: PAPER.edge, alignItems: "center", justifyContent: "center" }}><Text style={{ color: PAPER.ink, fontFamily: fonts.sans, fontSize: 13, fontWeight: "600" }}>{t("landing.invitation.no")}</Text></View>
        </View>
      </View>
    </View>
  );
}

function Float({ children, style }: PropsWithChildren<{ readonly style: ViewStyle }>): ReactNode {
  const palette = useColors();
  return <View style={[{ position: "absolute", flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, maxWidth: 280 }, style]}>{children}</View>;
}

/** The invitation, a reply arriving and the running count: one labelled picture for assistive technology. */
function HeroScene({ t }: { readonly t: Translate }): ReactNode {
  const palette = useColors();
  const tones = useTones();
  const name = t("landing.scene.replyName");
  return (
    <View role="img" aria-label={t("landing.scene.label")} style={{ width: "100%", maxWidth: 416, alignSelf: "center" }} testID="landing-scene">
      <View aria-hidden style={{ alignItems: "center", paddingTop: 60, paddingBottom: 48 }}>
        <PhoneInvitation t={t} />
          <Float style={{ top: 0, left: 0 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tones.green.bg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: tones.green.fg, fontWeight: "600" }}>{name.charAt(0)}</Text></View>
            <View style={{ flexShrink: 1 }}><Text style={{ color: palette.text, fontFamily: fonts.sans, fontWeight: "600", fontSize: 13 }}>{name}</Text><Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 13 }}>{t("landing.scene.replyBody")}</Text></View>
            <Text style={{ alignSelf: "flex-start", color: palette.textMuted, fontFamily: fonts.mono, fontSize: 10 }}>{t("landing.scene.replyWhen")}</Text>
          </Float>
        <Float style={{ bottom: 0, right: 0 }}>
          {svg({ width: 56, height: 56, viewBox: "0 0 44 44", style: { transform: "rotate(-90deg)" } },
            createElement("circle", { key: "track", cx: 22, cy: 22, r: 18, fill: "none", stroke: palette.border, strokeWidth: 4 }),
            createElement("circle", { key: "value", cx: 22, cy: 22, r: 18, fill: "none", stroke: palette.success, strokeWidth: 4, strokeLinecap: "round", pathLength: 100, strokeDasharray: "67 100" }))}
          <View><Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 13 }}>{t("landing.scene.countLabel")}</Text><Text style={{ color: palette.text, fontFamily: fonts.sans, fontWeight: "600", fontSize: 27, lineHeight: 28 }}>{t("landing.scene.countValue")}</Text><Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 13 }}>{t("landing.scene.countOf")}</Text></View>
        </Float>
      </View>
    </View>
  );
}

/** The same invitation in one of the catalogue's styles: paper, ink and type change, the content does not. */
function StyleCard({ t, style, sample }: { readonly t: Translate; readonly style: LandingStyle; readonly sample: LandingSample }): ReactNode {
  const palette = useColors();
  const sheet = SHEETS[style];
  const kicker = sample === "wedding" ? t("landing.styles.sampleWedding") : sample === "quince" ? t("landing.styles.sampleQuince") : t("landing.styles.sampleBaptism");
  const family = sheet.sans ? fonts.display : SERIF;
  const nameStyle: TextStyle = { fontFamily: family, fontSize: 26, lineHeight: 28, color: sheet.ink, textAlign: "center", fontStyle: sheet.italic ? "italic" : "normal", textTransform: sheet.upper ? "uppercase" : "none", fontWeight: sheet.upper ? "700" : sheet.sans ? "300" : "400" };
  return (
    <View style={{ width: 184, gap: 10 }} testID={`landing-style-${style}`}>
      <View aria-hidden style={{ aspectRatio: 3 / 4.3, borderRadius: 14, backgroundColor: sheet.paper, alignItems: "center", justifyContent: "space-between", paddingTop: 22, paddingBottom: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border }}>
        <Mono color={sheet.gold} size={9}>{kicker}</Mono>
        <View style={{ alignItems: "center" }}>
          {sample === "wedding" ? <><Text style={nameStyle}>{t("landing.invitation.first")}</Text><Text style={[nameStyle, { fontSize: sheet.upper ? 26 : 16, color: sheet.gold }]}>&amp;</Text><Text style={nameStyle}>{t("landing.invitation.second")}</Text></>
            : <Text style={nameStyle}>{sample === "quince" ? t("landing.styles.sampleQuinceName") : t("landing.styles.sampleBaptismName")}</Text>}
        </View>
        {style === "minimal" ? <View style={{ width: 24, height: 1, backgroundColor: sheet.ink }} /> : style === "editorial" ? null : <Sprig color={sheet.gold} width={72} />}
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1, color: sheet.ink }}>{t("landing.styles.sampleDate")}</Text>
        <View style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999, backgroundColor: sheet.ctaGold ? sheet.gold : sheet.ink }}><Text style={{ color: sheet.paper, fontFamily: fonts.sans, fontSize: 11, fontWeight: "600" }}>{t("landing.invitation.yes")}</Text></View>
      </View>
      <Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 14, fontWeight: "600" }}>{t(`landing.styles.${style}`)}</Text>
    </View>
  );
}

function Panel({ children, label, testID }: PropsWithChildren<{ readonly label: string; readonly testID?: string }>): ReactNode {
  const palette = useColors();
  return <View role="img" aria-label={label} testID={testID} style={{ padding: 22, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }}><View aria-hidden style={{ gap: 14 }}>{children}</View></View>;
}

function GuestPanel({ t }: { readonly t: Translate }): ReactNode {
  const palette = useColors();
  const tones = useTones();
  const stats = [["confirmed", LANDING_COUNTS.confirmed], ["pending", LANDING_COUNTS.pending], ["declined", LANDING_COUNTS.declined]] as const;
  return (
    <Panel label={t("landing.guests.panel")} testID="landing-guests-panel">
      <View style={{ flexDirection: "row", gap: 12 }}>{stats.map(([key, value]) => <View key={key} style={{ flex: 1 }}><Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 34, lineHeight: 36, fontWeight: "600", letterSpacing: -1.2 }}>{value}</Text><Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 13 }}>{t(`landing.guests.${key}`)}</Text></View>)}</View>
      <View style={{ flexDirection: "row", gap: 3, height: 8 }}>
        <View style={{ flexGrow: LANDING_COUNTS.confirmed, borderRadius: 999, backgroundColor: palette.success }} /><View style={{ flexGrow: LANDING_COUNTS.pending, borderRadius: 999, backgroundColor: palette.accentMuted }} /><View style={{ flexGrow: LANDING_COUNTS.declined, borderRadius: 999, backgroundColor: palette.border }} />
      </View>
      {LANDING_GUESTS.map((guest) => {
        const name = t(`landing.guests.${guest.key}`);
        const detail = [guest.plus ? t("landing.guests.plus", { count: guest.plus }) : "", guest.note ? t(`landing.guests.${guest.note}`) : ""].filter(Boolean).join(" · ");
        return (
          <View key={guest.key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: tones.green.bg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: tones.green.fg, fontWeight: "600" }}>{name.charAt(0)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: palette.text, fontFamily: fonts.sans, fontWeight: "600" }} numberOfLines={1}>{name}</Text>{detail ? <Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 13 }} numberOfLines={1}>{detail}</Text> : null}</View>
            <Tag tone={LANDING_STATUS[guest.status].tone}>{t(`landing.guests.${LANDING_STATUS[guest.status].label}`)}</Tag>
          </View>
        );
      })}
    </Panel>
  );
}

const GIFT_PATHS = {
  glass: ["M9 4h10l-1 8a4 4 0 0 1-8 0L9 4Z", "M14 16v6M10 22h8"],
  coffee: ["M6 9h13v6a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5V9Z", "M19 11h2a2 2 0 0 1 0 4h-2M10 4v2M14 4v2"],
  plane: ["M3 14l19-8-6 17-3-7-10-2Z", "M13 16l9-10"]
} as const;

function GiftPanel({ t, narrow }: { readonly t: Translate; readonly narrow: boolean }): ReactNode {
  const palette = useColors();
  return (
    <View role="img" aria-label={t("landing.gifts.panel")} style={{ flexDirection: narrow ? "column" : "row", gap: 12 }} testID="landing-gifts-panel">
      {LANDING_GIFTS.map((gift) => (
        <View key={gift.n} aria-hidden style={{ flex: 1, gap: 8, padding: 16, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }}>
          {svg({ width: 28, height: 28, viewBox: "0 0 28 28", fill: "none", stroke: palette.text, strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }, ...GIFT_PATHS[gift.kind].map(path))}
          <Text style={{ color: palette.text, fontFamily: fonts.sans, fontWeight: "600" }}>{t(`landing.gifts.i${gift.n}`)}</Text>
          <Text style={{ color: palette.textMuted, fontFamily: fonts.mono, fontSize: 13 }}>{t(`landing.gifts.p${gift.n}`)}</Text>
          <View style={{ alignSelf: "flex-start" }}><Tag tone={gift.tone}>{t(`landing.gifts.${gift.state}`)}</Tag></View>
        </View>
      ))}
    </View>
  );
}

function Chips({ items }: { readonly items: readonly { readonly label: string; readonly on: boolean }[] }): ReactNode {
  const palette = useColors();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{items.map((item) => <View key={item.label} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.md, borderWidth: 1, borderColor: item.on ? palette.primary : palette.border, backgroundColor: item.on ? palette.primary : palette.surface }}><Text style={{ color: item.on ? palette.onPrimary : palette.text, fontFamily: fonts.sans, fontSize: 13 }}>{item.label}</Text></View>)}</View>;
}

function ProviderPanel({ t }: { readonly t: Translate }): ReactNode {
  const palette = useColors();
  const tones = useTones();
  return (
    <Panel label={t("landing.providers.panel")} testID="landing-providers-panel">
      <Chips items={LANDING_PROVIDER_CHIPS.map((n) => ({ label: t(`landing.providers.c${n}`), on: n === 1 }))} />
      {LANDING_PROVIDERS.map(({ n, tone }) => (
        <View key={n} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.border }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: tones[tone].bg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: tones[tone].fg, fontWeight: "700" }}>{t(`landing.providers.n${n}`).charAt(0)}</Text></View>
          <View style={{ flex: 1, minWidth: 140 }}><Text style={{ color: palette.text, fontFamily: fonts.sans, fontWeight: "600" }}>{t(`landing.providers.n${n}`)}</Text><Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 13 }}>{t(`landing.providers.m${n}`)}</Text></View>
          <Tag tone="green">{t("landing.providers.verified")}</Tag>
          <Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 13, fontWeight: "600", textDecorationLine: "underline" }}>{t("landing.providers.quote")}</Text>
        </View>
      ))}
    </Panel>
  );
}

function StepArt({ t, step }: { readonly t: Translate; readonly step: 1 | 2 | 3 }): ReactNode {
  const palette = useColors();
  const tones = useTones();
  const field = (label: string): ReactNode => <View style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }}><Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 14 }}>{label}</Text></View>;
  return (
    <View aria-hidden style={{ minHeight: 200, justifyContent: "center", gap: 10, padding: 18, borderRadius: radius.lg, backgroundColor: palette.surfaceMuted }}>
      {step === 1 ? <><Chips items={[{ label: t("landing.how.artWedding"), on: true }, { label: t("landing.how.artQuince"), on: false }, { label: t("landing.how.artBaptism"), on: false }]} />{field(t("landing.how.artDate"))}{field(t("landing.how.artPlace"))}</> : null}
      {step === 2 ? (
        <>
          <View style={{ alignSelf: "flex-end", maxWidth: 240, gap: 3, padding: 12, borderRadius: 16, borderBottomRightRadius: 4, backgroundColor: tones.green.bg }}>
            <Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 14 }}>{t("landing.how.artMessage")}</Text>
            <Text style={{ color: palette.text, fontFamily: fonts.mono, fontSize: 12, textDecorationLine: "underline" }}>{t("landing.how.artLink")}</Text>
          </View>
          <Text style={{ alignSelf: "flex-end", color: palette.textMuted, fontFamily: fonts.sans, fontSize: 12 }}>{t("landing.how.artFor")}</Text>
        </>
      ) : null}
      {step === 3 ? LANDING_GUESTS.slice(0, 3).map((guest) => (
        <View key={guest.key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }}>
          <Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 14 }}>{t(`landing.guests.${guest.key}`)}</Text>
          <Tag tone={LANDING_STATUS[guest.status].tone}>{t(`landing.guests.${LANDING_STATUS[guest.status].label}`)}</Tag>
        </View>
      )) : null}
    </View>
  );
}

/** A question that opens to its answer, like `<details>` on the web: closed by default, its state announced. */
function FaqItem({ question, answer }: { readonly question: string; readonly answer: string }): ReactNode {
  const palette = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: 6 }}>
      <Pressable accessibilityRole="button" aria-expanded={open} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ flex: 1, color: palette.text, fontFamily: fonts.sans, fontSize: 17, fontWeight: "600" }}>{question}</Text>
        <Text aria-hidden style={{ color: palette.textMuted, fontSize: 20 }}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? <Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, paddingBottom: 10, maxWidth: 640 }}>{answer}</Text> : null}
    </View>
  );
}

function Ticks({ items }: { readonly items: readonly string[] }): ReactNode {
  const palette = useColors();
  return <View style={{ gap: 12 }}>{items.map((item) => <View key={item} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}><CheckMark size={24} /><Text style={{ flex: 1, color: palette.text, fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 }}>{item}</Text></View>)}</View>;
}

function Feature({ twoUp, flip = false, copy, art, testID }: { readonly twoUp: boolean; readonly flip?: boolean; readonly copy: ReactNode; readonly art: ReactNode; readonly testID: string }): ReactNode {
  return (
    <Column style={{ flexDirection: twoUp ? (flip ? "row-reverse" : "row") : "column", gap: twoUp ? 72 : 32, alignItems: twoUp ? "center" : "stretch" }}>
      <View style={{ flex: twoUp ? 0.9 : undefined, gap: 18, minWidth: 0 }} testID={testID}>{copy}</View>
      <View style={{ flex: twoUp ? 1.1 : undefined, minWidth: 0 }}>{art}</View>
    </Column>
  );
}

export function LandingScreen({ onNavigate }: LandingProps): ReactNode {
  const t = useT();
  const palette = useColors();
  const { wide, twoUp, three, narrow } = useLayout();
  const section: ViewStyle = { paddingTop: narrow ? 72 : 112 };
  const create = "/registro";
  return (
    <ScrollView role="main" tabIndex={0} style={{ flex: 1, backgroundColor: palette.canvas }} contentContainerStyle={{ paddingBottom: 0 }} testID="landing-screen">
      <View style={{ borderBottomWidth: 1, borderBottomColor: palette.border }}>
        <Column style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingVertical: 14 }}>
          <Logo tone="auto" height={26} label={t("landing.nav.home")} />
          <View role="navigation" aria-label={t("landing.nav.label")} style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 20 }} testID="landing-nav">
            {narrow ? null : <Link label={t("landing.nav.providers")} path="/proveedores" onNavigate={onNavigate} />}
            <Link label={t("landing.nav.signIn")} path="/login" onNavigate={onNavigate} testID="landing-sign-in" />
            {narrow ? null : <Solid label={t("landing.nav.create")} path="/registro" onNavigate={onNavigate} testID="landing-nav-create" />}
          </View>
        </Column>
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.canvas }}>
        <Column style={{ flexDirection: wide ? "row" : "column", alignItems: wide ? "center" : "stretch", gap: wide ? 64 : 40, paddingVertical: narrow ? 48 : 88 }}>
          <View style={{ flex: wide ? 1.1 : undefined, gap: 22, minWidth: 0 }}>
            <Enter from="down"><Text style={{ color: palette.textMuted, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{t("landing.hero.eyebrow")}</Text></Enter>
            <Heading level={1} size={narrow ? 44 : wide ? 76 : 60}>{t("landing.hero.title")}</Heading>
            <Lead>{t("landing.hero.body")}</Lead>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, columnGap: 28 }}>
              <Solid label={t("landing.hero.primary")} path={create} onNavigate={onNavigate} testID="landing-create" />
              <Link label={t("landing.hero.secondary")} path="/proveedores" onNavigate={onNavigate} testID="landing-directory" />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, columnGap: 22 }}>
              {LANDING_PROOF.map((key) => <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><CheckMark size={18} tone="success" /><Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 14 }}>{t(`landing.hero.${key}`)}</Text></View>)}
            </View>
          </View>
          {/* One entrance for the whole picture (orientation, not decoration); `Enter` honours reduced motion. */}
          <View style={{ flex: wide ? 0.9 : undefined, minWidth: 0 }}><Enter from="down" delay={200}><HeroScene t={t} /></Enter></View>
        </Column>
      </View>

      <View style={section}>
        <Column style={{ gap: 14 }}><Heading>{t("landing.styles.title")}</Heading><Lead>{t("landing.styles.body")}</Lead></Column>
        {/* The rail scrolls sideways on a phone: reachable and scrollable with the keyboard, as on the web. */}
        <ScrollView horizontal tabIndex={0} aria-label={t("landing.styles.title")} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: spacing[5], paddingVertical: 24, marginHorizontal: "auto" }} testID="landing-styles">
          {LANDING_STYLES.map((style) => <StyleCard key={style.key} t={t} style={style.key} sample={style.sample} />)}
        </ScrollView>
        <Column><Link label={t("landing.styles.link")} path={create} onNavigate={onNavigate} /></Column>
      </View>

      <View style={section}>
        <Column style={{ gap: 32 }}>
          <Heading>{t("landing.how.title")}</Heading>
          <View style={{ flexDirection: three ? "row" : "column", gap: 16 }} testID="landing-steps">
            {LANDING_STEPS.map(({ step, key }) => (
              <View key={key} style={{ flex: three ? 1 : undefined, gap: 10, padding: 16, paddingBottom: 26, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }}>
                <StepArt t={t} step={step} />
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 8, paddingHorizontal: 6 }}>
                  <Text aria-hidden style={{ color: palette.textMuted, fontFamily: fonts.mono, fontSize: 13 }}>{step}</Text>
                  <Heading level={3}>{t(`landing.how.${key}Title`)}</Heading>
                </View>
                <Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, paddingHorizontal: 6 }}>{t(`landing.how.${key}Body`)}</Text>
              </View>
            ))}
          </View>
        </Column>
      </View>

      <View style={section}><Feature twoUp={twoUp} testID="landing-guests" copy={<><Heading>{t("landing.guests.title")}</Heading><Lead>{t("landing.guests.body")}</Lead><Ticks items={LANDING_GUEST_POINTS.map((key) => t(`landing.guests.${key}`))} /></>} art={<GuestPanel t={t} />} /></View>
      <View style={section}><Feature twoUp={twoUp} flip testID="landing-gifts" copy={<><Heading>{t("landing.gifts.title")}</Heading><Lead>{t("landing.gifts.body")}</Lead></>} art={<GiftPanel t={t} narrow={narrow} />} /></View>
      <View style={section}>
        <Feature twoUp={twoUp} testID="landing-providers" art={<ProviderPanel t={t} />} copy={(
          <>
            <Heading>{t("landing.providers.title")}</Heading>
            <Lead>{t("landing.providers.body")}</Lead>
            <Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, maxWidth: 576 }}>{t("landing.facts.verified")} {t("landing.facts.limit")}</Text>
            <Link label={t("landing.providers.link")} path="/proveedores" onNavigate={onNavigate} />
          </>
        )} />
      </View>

      <View style={section}>
        <Column style={{ gap: 28 }}>
          <Heading>{t("landing.roles.title")}</Heading>
          <View style={{ flexDirection: twoUp ? "row" : "column", gap: 16 }} testID="landing-roles">
            {(["host", "guest", "provider"] as const).map((role) => (
              <View key={role} style={{ flex: twoUp ? 1 : undefined, gap: 10, padding: 24, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: role === "host" ? palette.surfaceMuted : palette.surface }}>
                <Heading level={3}>{t(`landing.roles.${role}Title`)}</Heading>
                <Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 }}>{t(`landing.roles.${role}Body`)}</Text>
                {role === "host" ? <Link label={t("landing.roles.hostLink")} path={create} onNavigate={onNavigate} /> : null}
                {role === "provider" ? <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 20 }}><Link label={t("landing.roles.providerLink")} path={create} onNavigate={onNavigate} /><Link label={t("landing.roles.directoryLink")} path="/proveedores" onNavigate={onNavigate} /></View> : null}
              </View>
            ))}
          </View>
        </Column>
      </View>

      <View style={section}>
        <Column style={{ gap: 20 }}>
          <Heading>{t("landing.types.title")}</Heading>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }} testID="landing-types">{LANDING_TYPES.map((type) => <View key={type} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: palette.border }}><Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 15 }}>{t(`landing.types.${type}`)}</Text></View>)}</View>
          <Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 15 }}>{t("landing.types.other")}</Text>
        </Column>
      </View>

      <View style={section}>
        <Column style={{ gap: 16 }}>
          <Heading>{t("landing.faq.title")}</Heading>
          <View testID="landing-faq">{LANDING_FAQ.map((key) => <FaqItem key={key} question={t(`landing.faq.${key}Q`)} answer={t(`landing.faq.${key}A`)} />)}</View>
        </Column>
      </View>

      <View style={[section, { paddingBottom: narrow ? 72 : 112 }]}>
        <Column>
          <View style={{ alignItems: "center", gap: 18, paddingVertical: narrow ? 48 : 72, paddingHorizontal: 24, borderRadius: 28, backgroundColor: palette.primary }} testID="landing-closing">
            <CheckMark size={44} />
            <Text accessibilityRole="header" aria-level={2} style={{ color: palette.onPrimary, fontFamily: fonts.display, fontSize: narrow ? 30 : 40, lineHeight: narrow ? 33 : 43, fontWeight: "600", textAlign: "center", letterSpacing: -1 }}>{t("landing.closing.title")}</Text>
            <Text style={{ color: palette.onPrimary, opacity: 0.8, fontFamily: fonts.sans, fontSize: 17, lineHeight: 25, textAlign: "center", maxWidth: 520 }}>{t("landing.closing.body")}</Text>
            <View style={{ alignSelf: "center" }}><Solid label={t("landing.closing.cta")} path={create} invert onNavigate={onNavigate} testID="landing-closing-cta" /></View>
          </View>
        </Column>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: palette.border }}>
        <Column style={{ gap: 12, paddingVertical: 28 }}>
          <Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: 15 }}>{t("landing.footer.tagline")}</Text>
          <LanguageSwitch />
        </Column>
      </View>
    </ScrollView>
  );
}
