import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button, StateHint, type State } from './index';
import { useTheme } from './theme';
import type { TimeFieldProps } from './time-field';

const pad = (n: number): string => String(n).padStart(2, '0');
const toTime = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
/** `HH:MM` to a local Date today at that time; an empty or malformed value starts the clock at noon. */
const fromTime = (time?: string): Date => {
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? '');
  const date = new Date();
  date.setHours(match ? Number(match[1]) : 12, match ? Number(match[2]) : 0, 0, 0);
  return date;
};
const unavailable = (state: State): boolean => state === 'disabled' || state === 'loading';

/** iOS and Android: the system clock behind the same value contract (24-hour `HH:MM`). */
export function TimeField({ label, value, onChange, state, error, testID }: TimeFieldProps) {
  const { styles, strings } = useTheme();
  const [open, setOpen] = useState(false);
  const pick = (event: DateTimePickerEvent, date?: Date) => {
    // Android closes its dialog itself; iOS stays open until "done".
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange?.(toTime(date));
  };
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${label}: ${value || strings.timePlaceholder}`} accessibilityState={{ disabled: unavailable(state) }} disabled={unavailable(state)} onPress={() => setOpen(true)} style={styles.input}>
        <Text style={styles.body}>{value || strings.timePlaceholder}</Text>
      </Pressable>
      {open ? <DateTimePicker value={fromTime(value)} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={pick} /> : null}
      {open && Platform.OS === 'ios' ? <Button variant="secondary" onPress={() => setOpen(false)}>{strings.close}</Button> : null}
      <StateHint state={state === 'empty' || state === 'disabled' ? undefined : state} error={error} />
    </View>
  );
}
