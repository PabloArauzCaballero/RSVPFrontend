import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { radius, spacing, typography } from '@rsvp/design-tokens';
import { Button, StateHint } from './index';
import { fonts } from './fonts';
import { NavIcon } from './nav-icon';
import { PressFeedback } from './press-feedback';
import { useTheme } from './theme';
import type { DateFieldProps } from './date-field';

const DAYS_PER_WEEK = 7;
const DAY_MS = 86_400_000;
const CELL = 44;
const PANEL_WIDTH = 392;
const SHEET_BELOW = 600;
const MONTHS_PER_YEAR = 12;

// UTC is used for arithmetic on date-only values. The event's zone determines which day is Today.
const dayKey = (date: Date): string => date.toISOString().slice(0, 10);
const isSupportedDay = (day: Date): boolean => day.getUTCFullYear() >= 100 && day.getUTCFullYear() <= 9999;
const stepDay = (day: Date, amount: number): Date => new Date(day.getTime() + amount * DAY_MS);

function parseDay(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00Z`);
  return isSupportedDay(day) && dayKey(day) === value ? day : null;
}

function todayIn(timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${fields.year}-${fields.month}-${fields.day}T00:00:00Z`);
}

function stepMonth(day: Date, amount: number): Date {
  const next = new Date(day);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + amount);
  const last = new Date(next);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  next.setUTCDate(Math.min(day.getUTCDate(), last.getUTCDate()));
  return next;
}

type CalendarProps = DateFieldProps & NonNullable<DateFieldProps['calendar']>;

/** The invitation's date picker. Selections stay calendar days until the host form combines them with the time. */
export function CalendarDateField({ label, value, onChange, state, error, testID, locale, timeZone, minimumDate }: CalendarProps) {
  const { palette, styles, strings } = useTheme();
  const { width } = useWindowDimensions();
  const [cursor, setCursor] = useState<Date | null>(null);
  const trigger = useRef<View>(null);
  const activeDay = useRef<HTMLButtonElement>(null);
  const focusDay = useRef(false);
  const hintId = useId();
  const selected = parseDay(value);
  const minimum = parseDay(minimumDate);
  const isBeforeMinimum = (day: Date): boolean => minimum !== null && day < minimum;
  const clampToMinimum = (day: Date): Date => minimum && day < minimum ? minimum : day;
  const disabled = state === 'disabled' || state === 'loading';
  const invalid = state === 'error' || Boolean(error);
  const sheet = width < SHEET_BELOW;
  const firstWeekday = locale === 'es-BO' ? 1 : 0;
  const weekdayIndex = (day: Date): number => (day.getUTCDay() - firstWeekday + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const caption = (day: Date, options: Intl.DateTimeFormatOptions): string => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(day);
  const shown = selected ? caption(selected, { dateStyle: 'medium' }) : strings.datePlaceholder;
  const today = cursor ? todayIn(timeZone) : null;
  const monthStart = cursor ? stepDay(cursor, 1 - cursor.getUTCDate()) : null;
  const firstCell = monthStart ? stepDay(monthStart, -weekdayIndex(monthStart)) : null;

  useEffect(() => {
    if (!cursor || !focusDay.current) return;
    const frame = requestAnimationFrame(() => {
      activeDay.current?.focus({ preventScroll: true });
      focusDay.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [cursor]);

  const close = (): void => {
    setCursor(null);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const choose = (day: Date | null): void => {
    if (day && isBeforeMinimum(day)) return;
    onChange?.(day ? dayKey(day) : '');
    close();
  };
  const move = (event: KeyboardEvent<HTMLButtonElement>, day: Date): void => {
    let next: Date;
    switch (event.key) {
      case 'ArrowLeft': next = stepDay(day, -1); break;
      case 'ArrowRight': next = stepDay(day, 1); break;
      case 'ArrowUp': next = stepDay(day, -DAYS_PER_WEEK); break;
      case 'ArrowDown': next = stepDay(day, DAYS_PER_WEEK); break;
      case 'Home': next = stepDay(day, -weekdayIndex(day)); break;
      case 'End': next = stepDay(day, DAYS_PER_WEEK - 1 - weekdayIndex(day)); break;
      case 'PageUp': next = stepMonth(day, event.shiftKey ? -MONTHS_PER_YEAR : -1); break;
      case 'PageDown': next = stepMonth(day, event.shiftKey ? MONTHS_PER_YEAR : 1); break;
      default: return;
    }
    event.preventDefault();
    const target = clampToMinimum(next);
    if (!isSupportedDay(target) || dayKey(target) === dayKey(day)) return;
    focusDay.current = true;
    setCursor(target);
  };

  const monthLabel = cursor ? caption(cursor, { month: 'long', year: 'numeric' }) : '';
  const monthButton = (delta: number, name: string, icon: string) => {
    if (!cursor) return null;
    const next = stepMonth(cursor, delta);
    const target = clampToMinimum(next);
    const allowed = isSupportedDay(next) && next.getUTCMonth() === target.getUTCMonth() && next.getUTCFullYear() === target.getUTCFullYear();
    return <PressFeedback accessibilityLabel={name} testID={delta < 0 ? 'calendar-previous-month' : 'calendar-next-month'} disabled={!allowed} hoverTint onPress={() => setCursor(target)}
      style={{ borderRadius: radius.button, borderWidth: 1, borderColor: palette.fieldBorder, alignItems: 'center', justifyContent: 'center' }}><NavIcon name={icon} color={palette.text} /></PressFeedback>;
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {state !== 'empty' ? (
        <PressFeedback ref={trigger} accessibilityLabel={`${label}: ${shown}`} aria-haspopup="dialog" aria-expanded={Boolean(cursor)} aria-invalid={invalid || undefined} aria-describedby={invalid ? hintId : undefined}
          disabled={disabled} testID={testID} onPress={() => { focusDay.current = true; setCursor(clampToMinimum(selected ?? todayIn(timeZone))); }}
          style={{ minHeight: 48, paddingHorizontal: spacing[3], borderRadius: radius.button, borderWidth: 1, borderColor: invalid ? palette.danger : palette.fieldBorder, backgroundColor: palette.surface, opacity: disabled ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] }}>
            <Text style={[styles.body, { flexShrink: 1, color: selected ? palette.text : palette.textMuted }]}>{shown}</Text>
            <NavIcon name="agenda" size={18} color={palette.textMuted} />
          </View>
        </PressFeedback>
      ) : null}
      <View nativeID={hintId}><StateHint state={state} error={error} /></View>
      {cursor && today && firstCell ? (
        <Modal visible transparent animationType="none" onRequestClose={close}>
          <View style={[styles.overlay, { justifyContent: sheet ? 'flex-end' : 'center' }]}>
            <Pressable pointerEvents="auto" aria-hidden tabIndex={-1} onPress={close} style={StyleSheet.absoluteFillObject} />
            <View role="dialog" aria-modal aria-label={label} accessibilityViewIsModal testID={testID ? `${testID}-panel` : undefined}
              style={{ width: '100%', maxWidth: sheet ? undefined : PANEL_WIDTH, maxHeight: '96%', alignSelf: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }}>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] }}>
                  {monthButton(-1, strings.datePreviousMonth, 'back')}
                  <Text aria-live="polite" style={{ flex: 1, textAlign: 'center', color: palette.text, fontFamily: fonts.sans, fontSize: typography.fontSize.lg, fontWeight: '600' }}>{monthLabel}</Text>
                  {monthButton(1, strings.dateNextMonth, 'arrow')}
                </View>
                <table role="grid" aria-label={monthLabel} style={{ width: '100%', tableLayout: 'fixed', borderSpacing: 0 }}>
                  <thead><tr>{Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
                    const day = stepDay(firstCell, index);
                    return <th key={index} scope="col" aria-label={caption(day, { weekday: 'long' })} style={{ paddingBottom: spacing[1], color: palette.textMuted, fontFamily: fonts.sans, fontSize: typography.fontSize.xs, fontWeight: 500 }}>{caption(day, { weekday: 'short' })}</th>;
                  })}</tr></thead>
                  <tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{Array.from({ length: DAYS_PER_WEEK }, (_, weekday) => {
                    const day = stepDay(firstCell, week * DAYS_PER_WEEK + weekday);
                    if (day.getUTCMonth() !== cursor.getUTCMonth()) return <td key={weekday} />;
                    const key = dayKey(day);
                    const active = key === dayKey(cursor);
                    const picked = key === value;
                    const current = key === dayKey(today);
                    const unavailable = isBeforeMinimum(day);
                    return <td key={weekday} aria-selected={picked} style={{ padding: 0 }}>
                      <button type="button" ref={active ? activeDay : undefined} data-testid={`calendar-day-${key}`} aria-label={caption(day, { dateStyle: 'full' })}
                        aria-current={current ? 'date' : undefined} disabled={unavailable} tabIndex={active ? 0 : -1} onKeyDown={(event) => move(event, day)} onClick={() => choose(day)}
                        style={{ display: 'block', width: '100%', minHeight: CELL, padding: 0, borderRadius: radius.md, border: `1px solid ${current ? palette.fieldBorder : 'transparent'}`, background: picked ? palette.primary : 'transparent', color: picked ? palette.onPrimary : unavailable ? palette.textMuted : palette.text, opacity: unavailable ? 0.5 : 1, fontFamily: fonts.sans, fontSize: typography.fontSize.base, fontWeight: picked ? 600 : 400, fontVariantNumeric: 'tabular-nums', cursor: unavailable ? 'default' : 'pointer', outlineColor: picked ? palette.onPrimary : palette.primary, outlineOffset: -3 }}>{day.getUTCDate()}</button>
                    </td>;
                  })}</tr>)}</tbody>
                </table>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing[2] }}>
                  <Button variant="secondary" icon="close" onPress={close}>{strings.cancel}</Button>
                  {selected ? <Button variant="ghost" icon="trash" onPress={() => choose(null)}>{strings.dateClear}</Button> : null}
                  <Button variant="secondary" icon="agenda" state={isBeforeMinimum(today) ? 'disabled' : 'default'} onPress={() => choose(today)}>{strings.dateToday}</Button>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
