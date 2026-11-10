import { WebPickerField, type PickerFieldProps } from './picker-field';

export type TimeFieldProps = PickerFieldProps;

/** Web and tests: the browser's clock behind a 24-hour time (`HH:MM`). The native build replaces this file with the system picker (`time-field.native.tsx`). */
export function TimeField(props: TimeFieldProps) {
  return <WebPickerField kind="time" {...props} />;
}
