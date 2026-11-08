import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { radius, spacing } from '@rsvp/design-tokens';
import { Avatar, Chip, Enter, PressFeedback, ScreenTransition, SkeletonList, Stagger, StepTransition, useTheme } from '@rsvp/ui';
import { useT } from '../../src/platform/providers';

/**
 * Temporary demonstration of the motion kit (docs/design/motion.md). Not linked from any navigation; the live script
 * `scripts/live/motion.mjs` measures it in a real Chrome. Copy comes from the shared catalogs (host.common / host.onboarding).
 */
const ROWS = 12;
/** The real row has a fixed height and the skeleton row gets the same, so swapping them moves nothing. */
const ROW_HEIGHT = 64;
const STEPS = ['type', 'who', 'name'] as const;

function Trigger({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }): ReactNode {
  const { palette } = useTheme();
  return (
    <PressFeedback testID={testID} accessibilityLabel={label} onPress={onPress} style={{ alignSelf: 'flex-start' }}>
      <View style={{ minHeight: 44, paddingHorizontal: spacing[5], borderRadius: radius.md, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: palette.onPrimary, fontWeight: '700' }}>{label}</Text>
      </View>
    </PressFeedback>
  );
}

export default function MotionDemo(): ReactNode {
  const t = useT();
  const { palette } = useTheme();
  const [shown, setShown] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(1);
  const [route, setRoute] = useState(0);
  const [presses, setPresses] = useState(0);
  const name = t(`host.onboarding.stepLabels.${STEPS[step - 1] ?? 'type'}`);
  const card = { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing[4], gap: spacing[3] };
  const body = { color: palette.text, fontSize: 16 };
  return (
    <ScrollView role="main" style={{ flex: 1, backgroundColor: palette.canvas }} contentContainerStyle={{ padding: spacing[4], gap: spacing[6], maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Text accessibilityRole="header" aria-level={1} style={{ color: palette.text, fontSize: 28, fontWeight: '800' }}>{t('host.onboarding.title')}</Text>

      <View style={{ gap: spacing[3] }}>
        <Trigger testID="demo-toggle-enter" label={shown ? t('host.common.remove') : t('host.common.add')} onPress={() => setShown((value) => !value)} />
        <Enter testID="demo-enter" play={shown}><View style={card}><Text style={body}>{t('host.onboarding.intro')}</Text></View></Enter>
      </View>

      <View testID="demo-stagger" style={{ gap: spacing[2] }}>
        <Stagger>{Array.from({ length: ROWS }, (_, index) => <View key={index} testID={`demo-row-${index}`} style={card}><Text style={body}>{index + 1}</Text></View>)}</Stagger>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Trigger testID="demo-press" label={t('host.common.next')} onPress={() => setPresses((value) => value + 1)} />
        <Text testID="demo-press-count" style={body}>{presses}</Text>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Trigger testID="demo-toggle-load" label={loaded ? t('host.common.loading') : t('host.common.add')} onPress={() => setLoaded((value) => !value)} />
        <View testID="demo-list" style={[card, { gap: 0 }]}>
          {loaded
            ? Array.from({ length: 5 }, (_, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], height: ROW_HEIGHT, paddingVertical: spacing[2] }}>
                  <Avatar name={`${index} ${index}`} />
                  <View style={{ flex: 1, gap: spacing[1] }}><Text style={[body, { fontWeight: '700' }]}>{index + 1}</Text><Text style={{ color: palette.textMuted, fontSize: 14 }}>{t('host.onboarding.progress')}</Text></View>
                  <Chip tone="yes">{t('host.common.add')}</Chip>
                </View>
              ))
            : <SkeletonList count={5} row={{ minHeight: ROW_HEIGHT }} label={t('host.common.loading')} />}
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <Trigger testID="demo-back" label={t('host.common.back')} onPress={() => setStep((value) => Math.max(1, value - 1))} />
          <Trigger testID="demo-next" label={t('host.common.next')} onPress={() => setStep((value) => Math.min(3, value + 1))} />
        </View>
        <StepTransition step={step} announce={`${t('host.onboarding.step', { step })}: ${name}`}>
          <View testID="demo-step" style={card}><Text style={body}>{`${t('host.onboarding.step', { step })} · ${name}`}</Text></View>
        </StepTransition>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Trigger testID="demo-navigate" label={t('host.common.next')} onPress={() => setRoute((value) => value + 1)} />
        <ScrollView testID="demo-scroll" tabIndex={0} style={{ height: 200, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md }}>
          <ScreenTransition routeKey={`demo-${route}`} groupKey={route % 3 === 2 ? 'other' : 'demo'}>
            {Array.from({ length: 10 }, (_, index) => <Text key={index} style={[body, { padding: spacing[3] }]}>{`${route}.${index + 1}`}</Text>)}
          </ScreenTransition>
        </ScrollView>
      </View>
    </ScrollView>
  );
}
