import type { ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';
import { brand, notice, radius, spacing, typography } from '@rsvp/design-tokens';
import { CheckMark } from './check-mark';
import { Illustration } from './illustration';
import type { IllustrationName, IllustrationTone } from './illustrations';
import { useTheme } from './theme';

const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
const READABLE = 520;
const BADGE = 72;

/** Warm one-liner under a page title. Optional, one sentence, no second heading. */
export function PageIntro({ children, tone = 'default' }: { children: string; tone?: 'default' | 'onDark' }) {
  const { palette } = useTheme();
  return <Text style={{ color: tone === 'onDark' ? brand.niebla : palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, maxWidth: READABLE, fontFamily }}>{children}</Text>;
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
export function EmptyState({ illustration, title, body, action, tone = 'brand' }: EmptyStateProps) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing[3], paddingVertical: spacing[8], paddingHorizontal: spacing[4], maxWidth: READABLE, alignSelf: 'center', width: '100%' }}>
      <Illustration name={illustration} tone={tone} size="lg" />
      <Text accessibilityRole="header" aria-level={2} style={{ color: palette.text, fontSize: typography.fontSize.xl, lineHeight: typography.lineHeight.xl, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', fontFamily }}>{title}</Text>
      <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, textAlign: 'center', fontFamily }}>{body}</Text>
      {action ? <View style={{ alignSelf: 'stretch', alignItems: 'center', marginTop: spacing[2] }}>{action}</View> : null}
    </View>
  );
}

/** Inline confirmation: the check is drawn, then the message stays. Announced politely. */
export function SuccessNote({ message, detail, play = true }: { message: string; detail?: string; play?: boolean }) {
  const { palette } = useTheme();
  return (
    <View role="status" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.md, backgroundColor: notice.successBg, minHeight: 44 }}>
      <CheckMark size={28} tone="success" play={play} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: palette.text, fontSize: typography.fontSize.base, fontWeight: '700', fontFamily }}>{message}</Text>
        {detail ? <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily }}>{detail}</Text> : null}
      </View>
    </View>
  );
}

/** A milestone (published, saved for good): the blue rounded badge with the tick drawn in it, a title and a line. Use once per milestone, never on a loop. */
export function Celebrate({ title, body, play = true, children }: { title: string; body?: string; play?: boolean; children?: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View role="status" style={{ alignItems: 'center', gap: spacing[3], padding: spacing[6], maxWidth: READABLE, alignSelf: 'center', width: '100%' }}>
      <View style={{ width: BADGE, height: BADGE, borderRadius: radius.lg, backgroundColor: brand.azul, alignItems: 'center', justifyContent: 'center' }}>
        <CheckMark size={44} tone="white" play={play} />
      </View>
      <Text accessibilityRole="header" aria-level={2} style={{ color: palette.text, fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7, textAlign: 'center', fontFamily }}>{title}</Text>
      {body ? <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, textAlign: 'center', fontFamily }}>{body}</Text> : null}
      {children}
    </View>
  );
}
