import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Modal as NativeModal, Pressable, ScrollView, Switch, Text, TextInput, View, type ViewStyle } from 'react-native';
import { spacing } from '@rsvp/design-tokens';
import { useTheme } from './theme';

export { UiProvider, useTheme, type ColorScheme } from './theme';
export { defaultStrings, type UiStrings } from './strings';

export type State = 'default' | 'loading' | 'error' | 'empty' | 'disabled';
export const componentStates: State[] = ['default', 'loading', 'error', 'empty', 'disabled'];
const unavailable = (state: State) => state === 'disabled' || state === 'loading';

function StateHint({ state, error }: { state?: State; error?: string }) {
  const { palette, styles, strings } = useTheme();
  if (state === 'loading') return <ActivityIndicator accessibilityLabel={strings.loading} color={palette.primary} />;
  if (state === 'empty') return <Text accessibilityRole="text" style={styles.body}>{strings.empty}</Text>;
  if (state === 'error' || error) return <Text accessibilityRole="alert" style={styles.help}>{error ?? strings.genericError}</Text>;
  return null;
}

export function Surface({ title, description }: { title: string; description: string }) {
  const { styles } = useTheme();
  return <View style={styles.page}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{description}</Text></View>;
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ children, onPress, variant = 'primary', state = 'default', accessibilityLabel, className }: PropsWithChildren<{ onPress?: () => void; variant?: ButtonVariant; state?: State; accessibilityLabel?: string; className?: string }>) {
  const { palette, styles, strings } = useTheme();
  const disabled = unavailable(state);
  const variantStyle = variant === 'secondary' ? styles.buttonSecondary : variant === 'ghost' ? styles.buttonGhost : variant === 'danger' ? styles.buttonDanger : undefined;
  const textStyle = variant === 'secondary' || variant === 'ghost' ? styles.buttonTextSecondary : variant === 'danger' ? styles.buttonTextDanger : undefined;
  const spinner = variant === 'primary' ? palette.onPrimary : variant === 'danger' ? palette.onDanger : palette.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : strings.action)}
      accessibilityState={{ disabled, busy: state === 'loading' }}
      disabled={disabled}
      onPress={onPress}
      className={className}
      style={[styles.button, variantStyle, disabled && styles.buttonDisabled]}
    >
      {state === 'loading' ? <ActivityIndicator color={spinner} accessibilityLabel={strings.loading} /> : <Text style={[styles.buttonText, textStyle]}>{children}</Text>}
    </Pressable>
  );
}

export function Input({ label, error, state = 'default', ...props }: { label: string; error?: string; state?: State } & React.ComponentProps<typeof TextInput>) {
  const { palette, styles } = useTheme();
  const disabled = unavailable(state);
  const invalid = state === 'error' || Boolean(error);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {state === 'empty' ? <StateHint state={state} /> : <TextInput accessibilityLabel={label} accessibilityState={{ disabled }} aria-invalid={invalid || undefined} editable={!disabled} placeholderTextColor={palette.textMuted} style={[styles.input, invalid && styles.inputError]} {...props} />}
      <StateHint state={state === 'empty' ? undefined : state} error={error} />
    </View>
  );
}

export function Select({ label, options, value, onChange, state = 'default', error }: { label: string; options: { label: string; value: string }[]; value?: string; onChange?: (value: string) => void; state?: State; error?: string }) {
  const { styles } = useTheme();
  const disabled = unavailable(state);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {state === 'empty' ? <StateHint state={state} /> : (
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.picker}>
          {options.map((option) => (
            <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: value === option.value, disabled }} disabled={disabled} onPress={() => onChange?.(option.value)} style={[styles.option, value === option.value && styles.optionSelected]}>
              <Text style={styles.body}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <StateHint state={state === 'empty' ? undefined : state} error={error} />
    </View>
  );
}

export function Checkbox({ label, value, onChange, state = 'default', error }: { label: string; value: boolean; onChange?: (value: boolean) => void; state?: State; error?: string }) {
  const { palette, styles } = useTheme();
  const disabled = unavailable(state);
  return (
    <View>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }} disabled={disabled} style={[styles.checkboxRow, disabled && styles.buttonDisabled]} onPress={() => onChange?.(!value)}>
        <View style={[styles.checkbox, value && styles.selected]}>{value && <Text style={{ color: palette.onPrimary }}>✓</Text>}</View>
        <Text style={styles.body}>{label}</Text>
      </Pressable>
      <StateHint state={state === 'empty' ? undefined : state} error={error} />
    </View>
  );
}

export function Card({ children, state = 'default', style, className }: PropsWithChildren<{ state?: State; style?: ViewStyle; className?: string }>) {
  const { styles } = useTheme();
  return <View accessibilityRole="summary" className={className} style={[styles.card, style]}><StateHint state={state} />{state === 'default' || state === 'disabled' ? children : null}</View>;
}

type OverlayProps = PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; state?: State }>;

export function Sheet({ visible, onClose, title, children, state = 'default' }: OverlayProps) {
  const { styles, strings } = useTheme();
  return (
    <NativeModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel={strings.close} style={styles.overlay} onPress={onClose}>
        <Pressable accessibilityViewIsModal style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text><StateHint state={state} />{state === 'default' && children}
          <Button variant="secondary" onPress={onClose}>{strings.close}</Button>
        </Pressable>
      </Pressable>
    </NativeModal>
  );
}

export function Modal({ visible, onClose, title, children, state = 'default' }: OverlayProps) {
  const { styles, strings } = useTheme();
  return (
    <NativeModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}><View accessibilityViewIsModal style={styles.modal}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text><StateHint state={state} />{state === 'default' && children}
        <Button variant="secondary" onPress={onClose}>{strings.close}</Button>
      </View></View>
    </NativeModal>
  );
}

export type ToastTone = 'neutral' | 'success' | 'error';

export function Toast({ message, visible, onDismiss, state = 'default', tone }: { message: string; visible: boolean; onDismiss?: () => void; state?: State; tone?: ToastTone }) {
  const { styles, strings } = useTheme();
  if (!visible) return null;
  const resolved: ToastTone = tone ?? (state === 'error' ? 'error' : 'neutral');
  const text = state === 'error' && !tone ? strings.genericError : message;
  return (
    <Pressable accessibilityRole="alert" accessibilityLabel={text} accessibilityHint={onDismiss ? strings.dismiss : undefined} onPress={onDismiss} style={[styles.toast, resolved === 'success' && styles.toastSuccess, resolved === 'error' && styles.toastError]}>
      <Text style={resolved === 'neutral' ? styles.toastText : styles.toastTextOnTone}>{text}</Text>
    </Pressable>
  );
}

export function Table({ columns, rows, state = 'default', emptyMessage }: { columns: string[]; rows: string[][]; state?: State; emptyMessage?: string }) {
  const { styles, strings } = useTheme();
  return (
    <View accessibilityRole="summary" accessibilityLabel={`${columns.join(', ')}: ${rows.length}`} style={styles.card}>
      <View style={styles.tableHead}>{columns.map((column) => <Text key={column} style={styles.cell}>{column}</Text>)}</View>
      {state === 'loading' || state === 'error' ? <StateHint state={state} />
        : rows.length === 0 || state === 'empty' ? <Text style={styles.body}>{emptyMessage ?? strings.emptyTable}</Text>
        : rows.map((row, index) => <View key={index} style={styles.tableRow}>{row.map((cell, cellIndex) => <Text key={cellIndex} style={styles.cell}>{cell}</Text>)}</View>)}
    </View>
  );
}

/** Native fallback: typed ISO date (AAAA-MM-DD). A platform picker belongs behind this same API. */
export function DatePicker({ label, value, onChange, state = 'default', error }: { label: string; value?: string; onChange?: (value: string) => void; state?: State; error?: string }) {
  return <Input label={label} value={value} onChangeText={onChange} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" state={state} error={error} />;
}

export function FileUpload({ label, fileName, onSelect, state = 'default', error }: { label: string; fileName?: string; onSelect?: () => void; state?: State; error?: string }) {
  const { styles, strings } = useTheme();
  const disabled = unavailable(state);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {state === 'empty' ? <StateHint state={state} /> : <Button accessibilityLabel={label} variant="secondary" state={disabled ? 'disabled' : 'default'} onPress={onSelect}>{fileName ?? strings.chooseFile}</Button>}
      <StateHint state={state === 'empty' ? undefined : state === 'disabled' ? undefined : state} error={error} />
    </View>
  );
}

export function SwitchWithConsequence({ label, value, consequence, pendingCount = 0, onChange }: { label: string; value: boolean; consequence: string; pendingCount?: number; onChange: (value: boolean) => void }) {
  const { styles } = useTheme();
  const [confirmation, setConfirmation] = useState<boolean | null>(null);
  const requestedValue = confirmation ?? value;
  return <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] }}><View style={{ flex: 1 }}><Text style={styles.label}>{label}</Text><Text style={styles.body}>{consequence}</Text></View><Switch accessibilityLabel={label} value={requestedValue} onValueChange={setConfirmation} /></View>{confirmation !== null && confirmation !== value ? <View style={{ gap: spacing[2] }}><Text accessibilityRole="alert" style={styles.body}>{pendingCount > 0 ? `Hay ${pendingCount} solicitudes pendientes; este cambio no las modifica.` : 'El cambio solo afectará las solicitudes futuras.'}</Text><Button onPress={() => { onChange(confirmation); setConfirmation(null); }}>Confirmar cambio</Button><Button variant="secondary" onPress={() => setConfirmation(null)}>Cancelar</Button></View> : null}</Card>;
}

const demoRows = [['Invitación', 'Activa']];

export function ComponentCatalog() {
  const { styles } = useTheme();
  const [checked, setChecked] = useState(false); const [selected, setSelected] = useState('uno');
  const [modal, setModal] = useState(false); const [sheet, setSheet] = useState(false); const [toast, setToast] = useState(false);
  const options = [{ label: 'Opción uno', value: 'uno' }, { label: 'Opción dos', value: 'dos' }];
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>Catálogo de componentes</Text>
      <View testID="nw-probe" className="rounded-lg border border-border bg-surface-muted p-4"><Text style={styles.body}>Cada bloque es un estado. Mismos tokens en claro y oscuro.</Text></View>
      <View className="flex-row flex-wrap gap-3">
        {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => <Button key={variant} variant={variant} onPress={() => setToast(true)}>{variant}</Button>)}
      </View>
      <View className="flex-row flex-wrap gap-3"><Button variant="secondary" onPress={() => setModal(true)}>Abrir diálogo</Button><Button variant="secondary" onPress={() => setSheet(true)}>Abrir panel</Button></View>
      {componentStates.map((state) => (
        <View key={state} className="gap-3" accessibilityLabel={`Estado ${state}`}>
          <Text accessibilityRole="header" style={styles.title}>Estado: {state}</Text>
          <Button state={state}>Acción</Button>
          <Input label="Nombre" placeholder="Escribe tu nombre" state={state} error={state === 'error' ? 'Escribe tu nombre completo.' : undefined} />
          <Select label="Opción" value={selected} onChange={setSelected} options={options} state={state} error={state === 'error' ? 'Elige una opción.' : undefined} />
          <Checkbox label="Acepto los términos" value={checked} onChange={setChecked} state={state} error={state === 'error' ? 'Debes aceptar.' : undefined} />
          <DatePicker label="Fecha" state={state} />
          <FileUpload label="Adjunto" state={state} />
          <Card state={state}><Text style={styles.body}>Contenido de la tarjeta</Text></Card>
          <Table columns={['Nombre', 'Estado']} rows={demoRows} state={state} />
        </View>
      ))}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Panel"><Text style={styles.body}>Contenido del panel.</Text></Sheet>
      <Modal visible={modal} onClose={() => setModal(false)} title="Confirmación"><Text style={styles.body}>Revisa esta acción antes de continuar.</Text></Modal>
      <Toast visible={toast} tone="success" message="Acción completada" onDismiss={() => setToast(false)} />
    </ScrollView>
  );
}
