import { useState, type ReactNode } from 'react';
import { Modal as NativeModal, Pressable, Text, View, useWindowDimensions, type TextStyle } from 'react-native';
import { radius, spacing, typography } from '@rsvp/design-tokens';
import { fonts } from './fonts';
import { Button, OverlayEnter, StateHint, overlayAnimation, type State } from './index';
import { PressFeedback } from './press-feedback';
import { useTheme } from './theme';
import type { PickerFieldProps } from './picker-field';

export type TimeFieldProps = PickerFieldProps;

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => index * MINUTE_STEP);
const NOON = 12;
const FIELD_HEIGHT = 48;
const CELL = 44;
const COLUMNS = 6;
const PANEL_WIDTH = 392;
const SHEET_BELOW = 600;
const DISPLAY_SIZE = 40;
const DEFAULT_HOUR = 6;
const pad = (n: number): string => String(n).padStart(2, '0');
const unavailable = (state: State): boolean => state === 'disabled' || state === 'loading';

interface Parts { readonly hour: number; readonly minute: number; readonly pm: boolean }

/** 24-hour `HH:MM` to the clock a person reads (1–12, minutes, morning or afternoon); null for an empty or malformed value. */
export function timeParts(value?: string): Parts | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');
  if (!match) return null;
  const hours = Number(match[1]);
  return { hour: hours % NOON || NOON, minute: Number(match[2]), pm: hours >= NOON };
}

export const timeValue = ({ hour, minute, pm }: Parts): string => `${pad((hour % NOON) + (pm ? NOON : 0))}:${pad(minute)}`;

/**
 * Web and tests: the product's own clock, not the browser's. A field that shows the time as people say it ("6:30 p. m.")
 * and opens a panel (a sheet on a phone, a dialog on a wide screen) with the hour, the minutes in steps of five and
 * morning or afternoon, each one tap away. The value contract is the same as on iOS/Android: 24-hour `HH:MM`.
 * The native build replaces this file with the system picker (`time-field.native.tsx`).
 */
export function TimeField({ label, value, onChange, state, error, testID }: TimeFieldProps) {
  const { palette, styles, strings } = useTheme();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const parts = timeParts(value);
  const invalid = state === 'error' || Boolean(error);
  const period = (pm: boolean): string => (pm ? strings.timePm : strings.timeAm);
  const shown = parts ? `${parts.hour}:${pad(parts.minute)} ${period(parts.pm)}` : '';
  // Before anything is chosen the first tap completes the rest with what most celebrations use: on the hour, in the evening.
  const base: Parts = parts ?? { hour: DEFAULT_HOUR, minute: 0, pm: true };
  const choose = (change: Partial<Parts>): void => onChange?.(timeValue({ ...base, ...change }));
  // A time typed elsewhere (19:52) keeps its own minute among the choices instead of being rounded behind the host's back.
  const minutes = parts && !MINUTES.includes(parts.minute) ? [...MINUTES, parts.minute].sort((a, b) => a - b) : MINUTES;
  const sheet = width < SHEET_BELOW;
  const cell = { width: `${100 / COLUMNS}%`, padding: 2 } as const;
  const face = (selected: boolean) => ({
    minHeight: CELL, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primary : 'transparent'
  }) as const;
  const faceText = (selected: boolean): TextStyle => ({ color: selected ? palette.onPrimary : palette.text, fontFamily: fonts.sans, fontSize: typography.fontSize.base, fontWeight: selected ? '600' : '400', fontVariant: ['tabular-nums'], textAlign: 'center' });
  const option = (key: string, text: string, name: string, selected: boolean, onPress: () => void, id: string) => (
    <View key={key} style={cell}>
      <PressFeedback accessibilityRole="radio" accessibilityLabel={name} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={onPress} testID={id} style={face(selected)}>
        <Text style={faceText(selected)}>{text}</Text>
      </PressFeedback>
    </View>
  );
  const group = (title: string, children: ReactNode) => (
    <View style={{ gap: spacing[2] }}>
      <Text style={[styles.label, { color: palette.textMuted }]}>{title}</Text>
      <View role="radiogroup" aria-label={title} style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -2 }}>{children}</View>
    </View>
  );
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {state === 'empty' ? <StateHint state={state} /> : (
        <PressFeedback accessibilityRole="button" accessibilityLabel={`${label}: ${shown || strings.timePlaceholder}`} aria-haspopup="dialog" aria-expanded={open} aria-invalid={invalid || undefined} accessibilityState={{ disabled: unavailable(state) }} disabled={unavailable(state)} onPress={() => setOpen(true)} testID={testID}
          style={{ minHeight: FIELD_HEIGHT, paddingHorizontal: spacing[3], borderRadius: radius.button, borderWidth: 1, borderColor: invalid ? palette.danger : palette.fieldBorder, backgroundColor: palette.surface, opacity: unavailable(state) ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, color: shown ? palette.text : palette.textMuted, fontFamily: fonts.sans, fontSize: typography.fontSize.base, fontVariant: ['tabular-nums'] }}>{shown || strings.timePlaceholder}</Text>
          {/* A small clock face drawn with two borders and two hands: no icon font, same weight as the field's text. */}
          <View aria-hidden style={{ width: 18, height: 18, borderRadius: radius.full, borderWidth: 1.5, borderColor: palette.textMuted }}>
            <View style={{ position: 'absolute', left: 6.5, top: 2.5, width: 1.5, height: 5.5, backgroundColor: palette.textMuted }} />
            <View style={{ position: 'absolute', left: 6.5, top: 6.5, width: 4.5, height: 1.5, backgroundColor: palette.textMuted }} />
          </View>
          </View>
        </PressFeedback>
      )}
      <StateHint state={state === 'empty' ? undefined : state} error={error} />
      {open ? (
        <NativeModal visible transparent animationType={overlayAnimation(sheet ? 'slide' : 'fade')} onRequestClose={() => setOpen(false)}>
          <Pressable accessibilityLabel={strings.close} tabIndex={-1} onPress={() => setOpen(false)} style={{ flex: 1, justifyContent: sheet ? 'flex-end' : 'center', backgroundColor: palette.scrim }}>
            <OverlayEnter from="down">
              <Pressable accessibilityViewIsModal role="dialog" aria-label={label} tabIndex={-1} onPress={(event) => event.stopPropagation()} testID={testID ? `${testID}-panel` : undefined}
                style={[{ width: '100%', maxWidth: sheet ? undefined : PANEL_WIDTH, alignSelf: 'center', cursor: 'auto', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, padding: spacing[5], gap: spacing[4] }, sheet ? { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: spacing[6] } : { borderRadius: radius.lg }]}>
                <View style={{ gap: spacing[1] }}>
                  <Text aria-live="polite" style={{ color: shown ? palette.text : palette.textMuted, fontFamily: fonts.display, fontSize: DISPLAY_SIZE, lineHeight: DISPLAY_SIZE + 6, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{shown || '–:–'}</Text>
                </View>
                {group(strings.timeHour, HOURS.map((hour) => option(`h${hour}`, String(hour), String(hour), parts?.hour === hour, () => choose({ hour }), `time-hour-${hour}`)))}
                {group(strings.timeMinute, minutes.map((minute) => option(`m${minute}`, pad(minute), pad(minute), parts?.minute === minute, () => choose({ minute }), `time-minute-${pad(minute)}`)))}
                <View role="radiogroup" aria-label={strings.timePeriod} style={{ flexDirection: 'row', gap: spacing[1], padding: spacing[1], borderRadius: radius.md, backgroundColor: palette.surfaceMuted }}>
                  {[false, true].map((pm) => {
                    const selected = parts?.pm === pm;
                    return (
                      <PressFeedback key={String(pm)} accessibilityRole="radio" accessibilityLabel={period(pm)} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={() => choose({ pm })} testID={`time-${pm ? 'pm' : 'am'}`}
                        style={{ flex: 1, minHeight: CELL, borderRadius: radius.md - 2, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? palette.surface : 'transparent', borderWidth: 1, borderColor: selected ? palette.fieldBorder : 'transparent' }}>
                        <Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: typography.fontSize.base, fontWeight: selected ? '600' : '400', textAlign: 'center' }}>{period(pm)}</Text>
                      </PressFeedback>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  <View style={{ flex: 1 }}><Button variant="secondary" icon="close" block state={parts ? 'default' : 'disabled'} onPress={() => { onChange?.(''); setOpen(false); }} testID="time-clear">{strings.timeClear}</Button></View>
                  <View style={{ flex: 1 }}><Button block onPress={() => setOpen(false)} testID="time-done">{strings.timeDone}</Button></View>
                </View>
              </Pressable>
            </OverlayEnter>
          </Pressable>
        </NativeModal>
      ) : null}
    </View>
  );
}
