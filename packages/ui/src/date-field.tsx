import { Input } from './index';
import { useTheme } from './theme';
import type { State } from './index';

export interface DateFieldProps { label: string; value?: string; onChange?: (value: string) => void; state: State; error?: string }

/** Web and tests: a typed ISO date (YYYY-MM-DD). The native build replaces this file with a platform picker (`date-field.native.tsx`). */
export function DateField({ label, value, onChange, state, error }: DateFieldProps) {
  const { strings } = useTheme();
  return <Input label={label} value={value} onChangeText={onChange} placeholder={strings.datePlaceholder} keyboardType="numbers-and-punctuation" state={state} error={error} />;
}
