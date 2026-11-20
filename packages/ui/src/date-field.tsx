import type { AppLocale } from '@rsvp/i18n/server';
import { CalendarDateField } from './calendar-date-field';
import { WebPickerField, type PickerFieldProps } from './picker-field';

export interface DateFieldProps extends PickerFieldProps {
  calendar?: { locale: AppLocale; timeZone: string };
}

export function DateField({ calendar, ...props }: DateFieldProps) {
  return calendar ? <CalendarDateField {...props} {...calendar} /> : <WebPickerField kind="date" {...props} />;
}
