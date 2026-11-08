import { createElement, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { radius, spacing, typography } from '@rsvp/design-tokens';
import { fonts } from './fonts';
import { useTheme } from './theme';

export interface FilterOption<T extends string = string> {
  value: T;
  /** Already translated. */
  label: string;
  /** Optional count shown as "Label (n)". */
  count?: number;
}

export interface FilterSelectProps<T extends string = string> {
  /** Accessible name of the control (translated), e.g. "Filtrar invitados". */
  label: string;
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/** Up to this many options a row of chips reads better; above it, use `FilterSelect`. */
export const FILTER_SELECT_THRESHOLD = 3;
const TOUCH = 44;
const text = (option: FilterOption): string => (option.count === undefined ? option.label : `${option.label} (${option.count})`);

/**
 * Filter picker for more than `FILTER_SELECT_THRESHOLD` options. Web: a native `<select>` (keyboard, mobile pickers and
 * screen readers for free; 44 px tall; themed with `color-scheme`). Native: a button that opens a sheet of radios.
 */
export function FilterSelect<T extends string = string>({ label, options, value, onChange, testID }: FilterSelectProps<T>) {
  const { palette, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) ?? options[0];
  if (!current) return null;
  const box = { minHeight: TOUCH, borderRadius: radius.button, borderWidth: 1, borderColor: palette.fieldBorder, backgroundColor: palette.surface };

  if (Platform.OS === 'web') {
    const chevron = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1.5l5 5 5-5" fill="none" stroke="${palette.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
    return createElement(
      'select',
      {
        'aria-label': label,
        'data-testid': testID,
        value,
        onChange: (event: { target: { value: string } }) => onChange(event.target.value as T),
        style: {
          boxSizing: 'border-box', minHeight: TOUCH, maxWidth: '100%', padding: `0 ${spacing[8]}px 0 ${spacing[3]}px`, borderRadius: radius.button, border: `1px solid ${palette.fieldBorder}`,
          backgroundColor: palette.surface, color: palette.text, fontFamily: fonts.sans, fontSize: typography.fontSize.base, fontWeight: 500, cursor: 'pointer', colorScheme: scheme,
          appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,${chevron}")`, backgroundRepeat: 'no-repeat', backgroundPosition: `right ${spacing[3]}px center`
        }
      },
      options.map((option) => createElement('option', { key: option.value, value: option.value }, text(option)))
    );
  }

  return (
    <View>
      <Pressable role="combobox" accessibilityLabel={`${label}: ${text(current)}`} aria-expanded={open} testID={testID} onPress={() => setOpen(true)} style={[box, { justifyContent: 'center', paddingHorizontal: spacing[3] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] }}>
          <Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: typography.fontSize.base, fontWeight: '500' }}>{text(current)}</Text>
          <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 8, height: 8, marginTop: -4, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: palette.textMuted, transform: [{ rotate: '45deg' }] }} />
        </View>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel={label} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: palette.scrim }} onPress={() => setOpen(false)}>
          <View role="radiogroup" accessibilityLabel={label} style={{ backgroundColor: palette.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing[3], paddingBottom: spacing[6] }}>
            {options.map((option) => {
              const on = option.value === value;
              return (
                <Pressable key={option.value} role="radio" aria-checked={on} accessibilityLabel={text(option)} onPress={() => { setOpen(false); onChange(option.value); }} style={{ minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: spacing[4], borderRadius: radius.md, backgroundColor: on ? palette.primaryMuted : 'transparent' }}>
                  <Text style={{ color: palette.text, fontSize: typography.fontSize.base, fontFamily: fonts.sans, fontWeight: on ? '600' : '400' }}>{text(option)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
