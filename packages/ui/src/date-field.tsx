import { WebPickerField, type PickerFieldProps } from './picker-field';

export type DateFieldProps = PickerFieldProps;

/** Web and tests: the browser's calendar behind an ISO date (`YYYY-MM-DD`). The native build replaces this file with the system picker (`date-field.native.tsx`). */
export function DateField(props: DateFieldProps) {
  return <WebPickerField kind="date" {...props} />;
}
