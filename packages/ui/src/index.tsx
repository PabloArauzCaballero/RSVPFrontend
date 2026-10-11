import type { PropsWithChildren, ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Modal as NativeModal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@rsvp/design-tokens';

type State = 'default' | 'loading' | 'error' | 'empty' | 'disabled';
const palette = colors.light;
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas, padding: spacing[4], gap: spacing[4] },
  title: { color: palette.text, fontSize: typography.fontSize.xl, lineHeight: typography.lineHeight.xl, fontWeight: '700' },
  body: { color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base },
  label: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: '600', marginBottom: spacing[1] },
  help: { color: palette.danger, fontSize: typography.fontSize.sm, marginTop: spacing[1] },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingHorizontal: spacing[4], backgroundColor: palette.primary },
  buttonSecondary: { backgroundColor: palette.primaryMuted },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: palette.onPrimary, fontSize: typography.fontSize.base, fontWeight: '600' },
  buttonTextSecondary: { color: palette.primary },
  input: { minHeight: 44, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, paddingHorizontal: spacing[3], color: palette.text, backgroundColor: palette.surface, fontSize: typography.fontSize.base },
  card: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing[4], gap: spacing[2] },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing[5], gap: spacing[3] },
  modal: { margin: spacing[4], marginTop: 'auto', marginBottom: 'auto', backgroundColor: palette.surface, borderRadius: radius.lg, padding: spacing[5], gap: spacing[3] },
  toast: { backgroundColor: palette.text, borderRadius: radius.md, padding: spacing[3] },
  toastText: { color: palette.surface },
  tableHead: { flexDirection: 'row', backgroundColor: palette.surfaceMuted },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: palette.border },
  cell: { flex: 1, padding: spacing[3], color: palette.text },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], minHeight: 44 },
  checkbox: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 2, borderColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: palette.primary },
  picker: { borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, overflow: 'hidden' },
  option: { padding: spacing[3], minHeight: 44, justifyContent: 'center' },
  optionSelected: { backgroundColor: palette.primaryMuted }
});

function StateHint({ state, error }: { state?: State; error?: string }) {
  if (state === 'loading') return <ActivityIndicator accessibilityLabel="Cargando" color={palette.primary} />;
  if (state === 'empty') return <Text accessibilityRole="text" style={styles.body}>No hay información disponible.</Text>;
  if (state === 'error' || error) return <Text accessibilityRole="alert" style={styles.help}>{error ?? 'No se pudo completar la acción.'}</Text>;
  return null;
}

export function Surface({ title, description }: { title: string; description: string }) {
  return <View style={styles.page}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{description}</Text></View>;
}

export function Button({ children, onPress, variant = 'primary', state = 'default', accessibilityLabel }: PropsWithChildren<{ onPress?: () => void; variant?: 'primary' | 'secondary'; state?: State; accessibilityLabel?: string }>) {
  const disabled = state === 'disabled' || state === 'loading';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : 'Acción')} accessibilityState={{ disabled, busy: state === 'loading' }} disabled={disabled} onPress={onPress} style={[styles.button, variant === 'secondary' && styles.buttonSecondary, disabled && styles.buttonDisabled]}>{state === 'loading' ? <ActivityIndicator color={variant === 'primary' ? palette.onPrimary : palette.primary} /> : <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>{children}</Text>}</Pressable>;
}

export function Input({ label, error, state = 'default', ...props }: { label: string; error?: string; state?: State } & React.ComponentProps<typeof TextInput>) {
  const disabled = state === 'disabled' || state === 'loading';
  return <View><Text style={styles.label}>{label}</Text>{state === 'empty' ? <StateHint state={state} /> : <TextInput accessibilityLabel={label} accessibilityState={{ disabled }} editable={!disabled} style={[styles.input, state === 'error' && { borderColor: palette.danger }]} {...props} /> }<StateHint state={state} error={error} /></View>;
}

export function Select({ label, options, value, onChange, state = 'default', error }: { label: string; options: { label: string; value: string }[]; value?: string; onChange?: (value: string) => void; state?: State; error?: string }) {
  const disabled = state === 'disabled' || state === 'loading';
  return <View><Text style={styles.label}>{label}</Text>{state === 'empty' ? <StateHint state={state} /> : <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.picker}>{options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: value === option.value, disabled }} disabled={disabled} onPress={() => onChange?.(option.value)} style={[styles.option, value === option.value && styles.optionSelected]}><Text style={styles.body}>{option.label}</Text></Pressable>)}</View>}<StateHint state={state} error={error} /></View>;
}

export function Checkbox({ label, value, onChange, state = 'default', error }: { label: string; value: boolean; onChange?: (value: boolean) => void; state?: State; error?: string }) {
  const disabled = state === 'disabled' || state === 'loading';
  return <View><Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }} disabled={disabled} style={styles.checkboxRow} onPress={() => onChange?.(!value)}><View style={[styles.checkbox, value && styles.selected]}>{value && <Text style={{ color: palette.onPrimary }}>✓</Text>}</View><Text style={styles.body}>{label}</Text></Pressable><StateHint state={state} error={error} /></View>;
}

export function Card({ children, state = 'default', style }: PropsWithChildren<{ state?: State; style?: ViewStyle }>) { return <View accessibilityRole="summary" style={[styles.card, style]}><StateHint state={state} />{state === 'default' || state === 'disabled' ? children : null}</View>; }

export function Sheet({ visible, onClose, title, children, state = 'default' }: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; state?: State }>) { return <NativeModal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable accessibilityViewIsModal style={styles.sheet} onPress={(event) => event.stopPropagation()}><Text accessibilityRole="header" style={styles.title}>{title}</Text><StateHint state={state} />{state === 'default' && children}<Button variant="secondary" onPress={onClose}>Cerrar</Button></Pressable></Pressable></NativeModal>; }

export function Modal({ visible, onClose, title, children, state = 'default' }: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; state?: State }>) { return <NativeModal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.overlay}><View accessibilityViewIsModal style={styles.modal}><Text accessibilityRole="header" style={styles.title}>{title}</Text><StateHint state={state} />{state === 'default' && children}<Button variant="secondary" onPress={onClose}>Cerrar</Button></View></View></NativeModal>; }

export function Toast({ message, visible, onDismiss, state = 'default' }: { message: string; visible: boolean; onDismiss?: () => void; state?: State }) { if (!visible) return null; return <Pressable accessibilityRole="alert" accessibilityLabel={message} onPress={onDismiss} style={styles.toast}><StateHint state={state} /><Text style={styles.toastText}>{state === 'error' ? 'No se pudo completar la acción.' : message}</Text></Pressable>; }

export function Table({ columns, rows, state = 'default', emptyMessage = 'No hay registros.' }: { columns: string[]; rows: string[][]; state?: State; emptyMessage?: string }) { return <View accessibilityRole="summary" accessibilityLabel={`Tabla con ${rows.length} filas`} style={styles.card}><View style={styles.tableHead}>{columns.map((column) => <Text key={column} style={styles.cell}>{column}</Text>)}</View>{state === 'loading' ? <StateHint state={state} /> : state === 'error' ? <StateHint state={state} /> : rows.length === 0 || state === 'empty' ? <Text style={styles.body}>{emptyMessage}</Text> : rows.map((row, index) => <View key={index} style={styles.tableRow}>{row.map((cell, cellIndex) => <Text key={cellIndex} style={styles.cell}>{cell}</Text>)}</View>)}</View>; }

export function DatePicker({ label, value, onChange, state = 'default', error }: { label: string; value?: string; onChange?: (value: string) => void; state?: State; error?: string }) { return <Input label={label} value={value} onChangeText={onChange} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" state={state} error={error} />; }

export function FileUpload({ label, fileName, onSelect, state = 'default', error }: { label: string; fileName?: string; onSelect?: () => void; state?: State; error?: string }) { const disabled = state === 'disabled' || state === 'loading'; return <View><Text style={styles.label}>{label}</Text>{state === 'empty' ? <StateHint state={state} /> : <Button accessibilityLabel={label} variant="secondary" state={disabled ? 'disabled' : 'default'} onPress={onSelect}>{fileName ?? 'Seleccionar archivo'}</Button>}<StateHint state={state} error={error} /></View>; }

export function SwitchWithConsequence({ label, value, consequence, pendingCount = 0, onChange }: { label: string; value: boolean; consequence: string; pendingCount?: number; onChange: (value: boolean) => void }) {
  const [confirmation, setConfirmation] = useState<boolean | null>(null);
  const requestedValue = confirmation ?? value;
  return <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] }}><View style={{ flex: 1 }}><Text style={styles.label}>{label}</Text><Text style={styles.body}>{consequence}</Text></View><Switch accessibilityLabel={label} value={requestedValue} onValueChange={setConfirmation} /></View>{confirmation !== null && confirmation !== value ? <View style={{ gap: spacing[2] }}><Text accessibilityRole="alert" style={styles.body}>{pendingCount > 0 ? `Hay ${pendingCount} solicitudes pendientes; este cambio no las modifica.` : 'El cambio solo afectará las solicitudes futuras.'}</Text><Button onPress={() => { onChange(confirmation); setConfirmation(null); }}>Confirmar cambio</Button><Button variant="secondary" onPress={() => setConfirmation(null)}>Cancelar</Button></View> : null}</Card>;
}

export function ComponentCatalog() {
  const [checked, setChecked] = useState(false); const [selected, setSelected] = useState('uno'); const [modal, setModal] = useState(false); const [sheet, setSheet] = useState(false); const [toast, setToast] = useState(false);
  return <ScrollView contentContainerStyle={styles.page}><Text accessibilityRole="header" style={styles.title}>Catálogo de componentes</Text><Card><Text style={styles.body}>Estados y accesibilidad de las primitivas universales.</Text></Card><Button onPress={() => setToast(true)}>Acción principal</Button><Input label="Nombre" placeholder="Escribe tu nombre" /><Select label="Opción" value={selected} onChange={setSelected} options={[{ label: 'Opción uno', value: 'uno' }, { label: 'Opción dos', value: 'dos' }]} /><Checkbox label="Acepto los términos" value={checked} onChange={setChecked} /><Button variant="secondary" onPress={() => setModal(true)}>Abrir diálogo</Button><Button variant="secondary" onPress={() => setSheet(true)}>Abrir panel</Button><Table columns={['Nombre', 'Estado']} rows={[["Invitación", "Activa"]]} /><DatePicker label="Fecha" /><FileUpload label="Adjunto" /><Card state="empty" /><Card state="error" /><Sheet visible={sheet} onClose={() => setSheet(false)} title="Panel"><Text style={styles.body}>Contenido del panel.</Text></Sheet><Modal visible={modal} onClose={() => setModal(false)} title="Confirmación"><Text style={styles.body}>Revisa esta acción antes de continuar.</Text></Modal><Toast visible={toast} message="Acción completada" onDismiss={() => setToast(false)} /></ScrollView>;
}

export const componentStates: State[] = ['default', 'loading', 'error', 'empty', 'disabled'];
