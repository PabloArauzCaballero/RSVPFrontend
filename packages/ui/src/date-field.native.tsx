import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button, StateHint, type State } from './index';
import { useTheme } from './theme';
import type { DateFieldProps } from './date-field';

const pad = (n: number): string => String(n).padStart(2, '0');
const toIso = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
/** ISO date to a local Date at noon, so no timezone shifts the calendar day. */
const fromIso = (iso?: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : new Date();
};
const unavailable = (state: State): boolean => state === 'disabled' || state === 'loading';

/** iOS and Android: the system date picker behind the same value contract (ISO `YYYY-MM-DD`). */
export function DateField({ label, value, onChange, state, error }: DateFieldProps) {
  const { styles, strings } = useTheme();
  const [open, setOpen] = useState(false);
  const pick = (event: DateTimePickerEvent, date?: Date) => {
    // Android closes its dialog itself; iOS stays open until "done".
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange?.(toIso(date));
  };
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || strings.datePlaceholder}`} accessibilityState={{ disabled: unavailable(state) }} disabled={unavailable(state)} onPress={() => setOpen(true)} style={styles.input}>
        <Text style={styles.body}>{value || strings.datePlaceholder}</Text>
      </Pressable>
      {open ? <DateTimePicker value={fromIso(value)} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={pick} /> : null}
      {open && Platform.OS === 'ios' ? <Button variant="secondary" onPress={() => setOpen(false)}>{strings.close}</Button> : null}
      <StateHint state={state === 'empty' || state === 'disabled' ? undefined : state} error={error} />
    </View>
  );
}
