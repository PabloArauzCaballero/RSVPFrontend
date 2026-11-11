import { createElement } from 'react';
import { Text, View } from 'react-native';
import { radius, spacing, typography } from '@rsvp/design-tokens';
import { fonts } from './fonts';
import { StateHint } from './index';
import { useTheme } from './theme';
import type { State } from './index';

export interface PickerFieldProps { label: string; value?: string; onChange?: (value: string) => void; state: State; error?: string; testID?: string }

const FIELD_HEIGHT = 48;
// Tighter than a text input: the browser draws its own calendar or clock button inside, and a 12-hour time must fit in half a phone row.
const unavailable = (state: State): boolean => state === 'disabled' || state === 'loading';

/**
 * Web and tests: the browser's own date or time control (`<input type="date|time">`). It opens the calendar or the clock
 * of the device (the wheel on a phone, the popup on a desktop), is keyboard and screen-reader operable, and can only hold
 * a real value, so nobody types a format. The value contract is the same as on iOS/Android: `YYYY-MM-DD` and `HH:MM`.
 */
export function WebPickerField({ kind, label, value, onChange, state, error, testID }: PickerFieldProps & { kind: 'date' | 'time' }) {
  const { palette, styles, scheme } = useTheme();
  const invalid = state === 'error' || Boolean(error);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {state === 'empty' ? <StateHint state={state} /> : createElement('input', {
        type: kind,
        'aria-label': label,
        'aria-invalid': invalid || undefined,
        'data-testid': testID,
        disabled: unavailable(state),
        value: value ?? '',
        onChange: (event: { target: { value: string } }) => onChange?.(event.target.value),
        style: {
          boxSizing: 'border-box', display: 'block', width: '100%', minWidth: 0, minHeight: FIELD_HEIGHT, margin: 0, padding: `0 ${spacing[3]}px`, borderRadius: radius.button,
          border: `1px solid ${invalid ? palette.danger : palette.fieldBorder}`, backgroundColor: palette.surface, color: palette.text, fontFamily: fonts.sans,
          fontSize: typography.fontSize.base, lineHeight: `${FIELD_HEIGHT - 2}px`, colorScheme: scheme, opacity: unavailable(state) ? 0.6 : 1
        }
      })}
      <StateHint state={state === 'empty' ? undefined : state} error={error} />
    </View>
  );
}
