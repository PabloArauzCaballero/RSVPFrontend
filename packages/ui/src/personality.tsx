import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { radius, spacing, typography } from '@rsvp/design-tokens';
import { CheckMark } from './scheme-check';
import { fonts } from './fonts';
import { Illustration } from './illustration';
import type { IllustrationName, IllustrationTone } from './illustrations';
import { tracking, useTheme } from './theme';
import { ButtonAlignContext } from './press-visual';

const READABLE = 520;

/** Warm one-liner under a page title. Optional, one sentence, no second heading. */
export function PageIntro({ children, tone = 'default' }: { children: string; tone?: 'default' | 'onDark' }) {
  const { palette } = useTheme();
  return <Text style={{ color: tone === 'onDark' ? palette.text : palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, maxWidth: READABLE, fontFamily: fonts.sans }}>{children}</Text>;
}

export interface EmptyStateProps {
  illustration: IllustrationName;
  /** What this is, as a short phrase ("Aquí verás quién viene"). */
  title: string;
  /** Why it matters and what the first tap is, in one or two sentences. */
  body: string;
  /** The single first step, normally one `<Button>`. */
  action?: ReactNode;
  tone?: IllustrationTone;
}

/** An empty screen that answers three questions: what is this, why does it matter, what is the first tap. Not a card; it sits on the page. */
export function EmptyState({ illustration, title, body, action, tone }: EmptyStateProps) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing[4], paddingVertical: spacing[12], paddingHorizontal: spacing[4], maxWidth: READABLE, alignSelf: 'center', width: '100%' }}>
      <Illustration name={illustration} tone={tone ?? 'auto'} size="md" />
      <Text accessibilityRole="header" aria-level={2} style={{ color: palette.text, fontSize: 28, lineHeight: 32, fontWeight: '500', letterSpacing: tracking(28, -0.02), textAlign: 'center', fontFamily: fonts.display }}>{title}</Text>
      <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, textAlign: 'center', fontFamily: fonts.sans }}>{body}</Text>
      {action ? <View style={{ alignSelf: 'stretch', alignItems: 'center', marginTop: spacing[2] }}><ButtonAlignContext.Provider value="center">{action}</ButtonAlignContext.Provider></View> : null}
    </View>
  );
}

/** Inline confirmation: the check is drawn, then the message stays. Announced politely. */
export function SuccessNote({ message, detail, play = true }: { message: string; detail?: string; play?: boolean }) {
  const { palette } = useTheme();
  return (
    <View role="status" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, minHeight: 44 }}>
      <CheckMark size={28} tone="success" play={play} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: palette.text, fontSize: typography.fontSize.base, fontWeight: '600', fontFamily: fonts.sans }}>{message}</Text>
        {detail ? <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: fonts.sans }}>{detail}</Text> : null}
      </View>
    </View>
  );
}

/** A milestone (published, saved for good): the tick drawn on its pastel disc, a serif title and a line. Use once per milestone, never on a loop. */
export function Celebrate({ title, body, play = true, children }: { title: string; body?: string; play?: boolean; children?: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View role="status" style={{ alignItems: 'center', gap: spacing[4], padding: spacing[8], maxWidth: READABLE, alignSelf: 'center', width: '100%' }}>
      <CheckMark size={72} play={play} />
      <Text accessibilityRole="header" aria-level={2} style={{ color: palette.text, fontSize: 34, lineHeight: 38, fontWeight: '500', letterSpacing: tracking(34, -0.02), textAlign: 'center', fontFamily: fonts.display }}>{title}</Text>
      {body ? <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, textAlign: 'center', fontFamily: fonts.sans }}>{body}</Text> : null}
      <ButtonAlignContext.Provider value="center">{children}</ButtonAlignContext.Provider>
    </View>
  );
}
