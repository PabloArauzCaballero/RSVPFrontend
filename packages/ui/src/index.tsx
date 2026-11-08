import type { PropsWithChildren } from 'react';
import { useContext, useState } from 'react';
import { ActivityIndicator, Modal as NativeModal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { avatars, chips, radius, spacing, typography } from '@rsvp/design-tokens';
import { useTheme } from './theme';
import { ButtonAlignContext, pressVisual } from './press-visual';
import { Enter } from './enter';
import { useReducedMotion } from './motion';

export { UiProvider, useTheme, useColors, useThemedStyles, type ColorScheme, type Palette } from './theme';
import { DateField } from './date-field';
export { Logo, type LogoProps, type LogoTone } from './logo';
export { CheckMark, type CheckMarkProps } from './scheme-check';
export { Illustration, type IllustrationProps } from './illustration';
export { ILLUSTRATION_NAMES, type IllustrationName, type IllustrationTone } from './illustrations';
export * from './identity';
export { EmptyState, PageIntro, SuccessNote, Celebrate, type EmptyStateProps } from './personality';
export { StickyActions, type StickyActionsProps } from './sticky-actions';
export { OverflowMenu, type OverflowMenuItem, type OverflowMenuProps } from './overflow-menu';
export { FilterSelect, FILTER_SELECT_THRESHOLD, type FilterOption, type FilterSelectProps } from './filter-select';
export { ButtonAlignContext, pressVisual } from './press-visual';
export { useReducedMotion, MOTION } from './motion';
export * from './motion-kit';
export { defaultStrings, stringsFor, type UiStrings } from './strings';

export type State = 'default' | 'loading' | 'error' | 'empty' | 'disabled';
export const componentStates: State[] = ['default', 'loading', 'error', 'empty', 'disabled'];
const unavailable = (state: State) => state === 'disabled' || state === 'loading';

export function StateHint({ state, error }: { state?: State; error?: string }) {
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

const WIDE_BUTTONS = 640;

/** Full width on a phone (a thumb target), content width from 640 px up, unless `block`. */
export function Button({ children, onPress, variant = 'primary', state = 'default', accessibilityLabel, className, testID, block = false }: PropsWithChildren<{ onPress?: () => void; variant?: ButtonVariant; state?: State; accessibilityLabel?: string; className?: string; testID?: string; block?: boolean }>) {
  const { palette, styles, strings } = useTheme();
  const { width } = useWindowDimensions();
  const align = useContext(ButtonAlignContext);
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const disabled = unavailable(state);
  const variantStyle = variant === 'secondary' ? styles.buttonSecondary : variant === 'ghost' ? styles.buttonGhost : variant === 'danger' ? styles.buttonDanger : undefined;
  const textStyle = variant === 'secondary' || variant === 'ghost' ? styles.buttonTextSecondary : variant === 'danger' ? styles.buttonTextDanger : undefined;
  const spinner = variant === 'primary' ? palette.onPrimary : variant === 'danger' ? palette.onDanger : palette.primary;
  const place = width >= WIDE_BUTTONS && !block ? { alignSelf: align === 'center' ? 'center' : 'flex-start' } as const : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : strings.action)}
      accessibilityState={{ disabled, busy: state === 'loading' }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={className}
      testID={testID}
      style={place}
    >
      <View style={[styles.button, variantStyle, disabled && styles.buttonDisabled, pressVisual(pressed && !disabled, reduced)]}>
        {state === 'loading' ? <ActivityIndicator color={spinner} accessibilityLabel={strings.loading} /> : <Text style={[styles.buttonText, textStyle]}>{children}</Text>}
      </View>
    </Pressable>
  );
}

export function Input({ label, error, state = 'default', style, ...props }: { label: string; error?: string; state?: State } & React.ComponentProps<typeof TextInput>) {
  const { palette, styles } = useTheme();
  const disabled = unavailable(state);
  const invalid = state === 'error' || Boolean(error);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {state === 'empty' ? <StateHint state={state} /> : <TextInput accessibilityLabel={label} accessibilityState={{ disabled }} aria-invalid={invalid || undefined} editable={!disabled} placeholderTextColor={palette.textMuted} style={[styles.input, invalid && styles.inputError, style]} {...props} />}
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
            <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} aria-checked={value === option.value} accessibilityState={{ checked: value === option.value, disabled }} disabled={disabled} onPress={() => onChange?.(option.value)} style={[styles.option, value === option.value && styles.optionSelected]}>
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
      <Pressable accessibilityRole="checkbox" accessibilityLabel={label} aria-checked={value} accessibilityState={{ checked: value, disabled }} disabled={disabled} style={[styles.checkboxRow, disabled && styles.buttonDisabled]} onPress={() => onChange?.(!value)}>
        <View style={[styles.checkbox, value && styles.selected]}>{value && <View style={{ width: 6, height: 12, marginTop: -2, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: palette.onPrimary, transform: [{ rotate: '45deg' }] }} />}</View>
        <Text style={styles.body}>{label}</Text>
      </Pressable>
      <StateHint state={state === 'empty' ? undefined : state} error={error} />
    </View>
  );
}

const SWITCH_ROW_MIN_HEIGHT = 56;
const TRACK = { width: 44, height: 26, radius: 13, knob: 22 };
/** react-native-web understands outline styles that the native types do not declare. */
const focusRing = (color: string): object => (Platform.select({ web: { outlineColor: color, outlineWidth: 2, outlineOffset: 2 }, default: {} }) as object);

/**
 * On/off setting as a whole row (WAI-ARIA switch): the row is the touch target (56 px high, never the 20 px native Switch),
 * the track is only the picture of the state. Space and Enter toggle on the web, as does a tap; disabled rows ignore all three.
 */
export function SwitchRow({ label, hint, value, onChange, disabled = false, testID }: { label: string; hint?: string; value: boolean; onChange?: (value: boolean) => void; disabled?: boolean; testID?: string }) {
  const { palette, styles } = useTheme();
  const toggle = () => { if (!disabled) onChange?.(!value); };
  // rn-web's Pressable answers Enter and touch but not the space bar; a switch must answer it too.
  const keyboard = { onKeyDown: (event: { key: string; preventDefault: () => void }) => { if (event.key === ' ' || event.key === 'Spacebar') { event.preventDefault(); toggle(); } } };
  return (
    <Pressable
      accessibilityRole="switch" role="switch" aria-checked={value} aria-disabled={disabled} accessibilityLabel={label} accessibilityState={{ checked: value, disabled }}
      disabled={disabled} focusable={!disabled} tabIndex={disabled ? -1 : 0} onPress={toggle} {...(testID ? { testID } : {})} {...(keyboard as object)}
      style={[{ minHeight: SWITCH_ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] }, disabled && styles.buttonDisabled, focusRing(palette.primary)]}
    >
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.body}>{label}</Text>
        {hint ? <Text style={[styles.body, { fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm }]}>{hint}</Text> : null}
      </View>
      <View style={{ width: TRACK.width, height: TRACK.height, borderRadius: TRACK.radius, padding: 2, justifyContent: 'center', backgroundColor: value ? palette.primary : palette.border }}>
        <View style={{ width: TRACK.knob, height: TRACK.knob, borderRadius: TRACK.knob / 2, backgroundColor: value ? palette.onPrimary : palette.surface, alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </Pressable>
  );
}

export function Card({ children, state = 'default', style, className }: PropsWithChildren<{ state?: State; style?: ViewStyle; className?: string }>) {
  const { styles } = useTheme();
  return <View accessibilityRole="summary" className={className} style={[styles.card, style]}><StateHint state={state} />{state === 'default' || state === 'disabled' ? children : null}</View>;
}

/**
 * Web draws the opening with `Enter` (opacity + a short rise, reduced-motion aware) and turns the platform animation off;
 * native keeps its own (slide for a sheet, fade for a dialog), which already follows the system's Reduce Motion.
 */
export const overlayAnimation = (native: 'slide' | 'fade'): 'none' | 'slide' | 'fade' => (Platform.OS === 'web' ? 'none' : native);

/** Opening motion of a sheet or dialog on web; a plain wrapper on native. Keeps the width of a sheet (full) and of a dialog (centred). */
export function OverlayEnter({ from, children }: PropsWithChildren<{ from: 'down' | 'none' }>) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return <Enter from={from} distance={from === 'down' ? 24 : 8} grow={from === 'none'}>{children}</Enter>;
}

type OverlayProps = PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; state?: State }>;

export function Sheet({ visible, onClose, title, children, state = 'default' }: OverlayProps) {
  const { styles, strings } = useTheme();
  return (
    <NativeModal visible={visible} transparent animationType={overlayAnimation('slide')} onRequestClose={onClose}>
      <Pressable accessibilityLabel={strings.close} style={styles.overlay} onPress={onClose}>
        <OverlayEnter from="down">
          <Pressable accessibilityViewIsModal style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text><StateHint state={state} />{state === 'default' && children}
            <Button variant="secondary" onPress={onClose}>{strings.close}</Button>
          </Pressable>
        </OverlayEnter>
      </Pressable>
    </NativeModal>
  );
}

export function Modal({ visible, onClose, title, children, state = 'default' }: OverlayProps) {
  const { styles, strings } = useTheme();
  return (
    <NativeModal visible={visible} transparent animationType={overlayAnimation('fade')} onRequestClose={onClose}>
      <View style={styles.overlay}><OverlayEnter from="none"><View accessibilityViewIsModal style={styles.modal}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text><StateHint state={state} />{state === 'default' && children}
        <Button variant="secondary" onPress={onClose}>{strings.close}</Button>
      </View></OverlayEnter></View>
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

/** ISO `YYYY-MM-DD` value. iOS/Android open the system picker (`date-field.native.tsx`); web and tests type the date. */
export function DatePicker({ label, value, onChange, state = 'default', error }: { label: string; value?: string; onChange?: (value: string) => void; state?: State; error?: string }) {
  return <DateField label={label} value={value} onChange={onChange} state={state} error={error} />;
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
  const { styles, strings } = useTheme();
  const [confirmation, setConfirmation] = useState<boolean | null>(null);
  const requestedValue = confirmation ?? value;
  return <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] }}><View style={{ flex: 1 }}><Text style={styles.label}>{label}</Text><Text style={styles.body}>{consequence}</Text></View><Switch accessibilityLabel={label} value={requestedValue} onValueChange={setConfirmation} /></View>{confirmation !== null && confirmation !== value ? <View style={{ gap: spacing[2] }}><Text accessibilityRole="alert" style={styles.body}>{pendingCount > 0 ? `Hay ${pendingCount} solicitudes pendientes; este cambio no las modifica.` : 'El cambio solo afectará las solicitudes futuras.'}</Text><Button onPress={() => { onChange(confirmation); setConfirmation(null); }}>{strings.confirmChange}</Button><Button variant="secondary" onPress={() => setConfirmation(null)}>{strings.cancel}</Button></View> : null}</Card>;
}

export type ChipTone = 'yes' | 'maybe' | 'wait' | 'no';
/** RSVP status pill from the kit: a dot and a word, never colour alone. */
export function Chip({ tone, children }: PropsWithChildren<{ tone: ChipTone }>) {
  const { scheme } = useTheme();
  const c: { bg: string; fg: string; dot: string; border?: string } = chips[scheme][tone];
  return (
    <View accessibilityRole="text" style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, height: 30, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: c.bg, borderWidth: c.border ? 1 : 0, borderColor: c.border }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.dot }} />
      <Text style={{ color: c.fg, fontSize: 13, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');

/** Initials on one of the four brand grounds, picked from the name so the same person keeps the same colour. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const { scheme } = useTheme();
  const grounds = avatars[scheme];
  const c = grounds[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % grounds.length]!;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.fg, fontSize: Math.round(size * 0.36), fontWeight: '800' }}>{initials(name)}</Text>
    </View>
  );
}

export function ComponentCatalog() {
  const { styles, palette, strings: t } = useTheme();
  const demoRows = [[t.catalogRowName, t.catalogRowStatus]];
  const [checked, setChecked] = useState(false); const [selected, setSelected] = useState('uno');
  const [modal, setModal] = useState(false); const [sheet, setSheet] = useState(false); const [toast, setToast] = useState(false);
  const options = [{ label: t.catalogOptionOne, value: 'uno' }, { label: t.catalogOptionTwo, value: 'dos' }];
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>{t.catalogTitle}</Text>
      {/* NativeWind classes carry the shape; the colours come from the active theme so text and surface always flip together (light, dark). */}
      <View testID="nw-probe" className="rounded-lg border p-4" style={{ backgroundColor: palette.surfaceMuted, borderColor: palette.border }}><Text style={styles.body}>{t.catalogIntro}</Text></View>
      <View className="flex-row flex-wrap gap-3">
        {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => <Button key={variant} variant={variant} onPress={() => setToast(true)}>{variant}</Button>)}
      </View>
      <View className="flex-row flex-wrap gap-3"><Button variant="secondary" onPress={() => setModal(true)}>{t.catalogOpenDialog}</Button><Button variant="secondary" onPress={() => setSheet(true)}>{t.catalogOpenPanel}</Button></View>
      {componentStates.map((state) => (
        <View key={state} className="gap-3" accessibilityLabel={`${t.catalogState} ${state}`}>
          <Text accessibilityRole="header" style={styles.title}>{t.catalogState} {state}</Text>
          <Button state={state}>{t.action}</Button>
          <Input label={t.catalogName} placeholder={t.catalogNamePlaceholder} state={state} error={state === 'error' ? t.catalogNameError : undefined} />
          <Select label={t.catalogOption} value={selected} onChange={setSelected} options={options} state={state} error={state === 'error' ? t.catalogOptionError : undefined} />
          <Checkbox label={t.catalogTerms} value={checked} onChange={setChecked} state={state} error={state === 'error' ? t.catalogTermsError : undefined} />
          <DatePicker label={t.catalogDate} state={state} />
          <FileUpload label={t.catalogAttachment} state={state} />
          <Card state={state}><Text style={styles.body}>{t.catalogCard}</Text></Card>
          <Table columns={[t.catalogColName, t.catalogColStatus]} rows={demoRows} state={state} />
        </View>
      ))}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title={t.catalogPanel}><Text style={styles.body}>{t.catalogPanelBody}</Text></Sheet>
      <Modal visible={modal} onClose={() => setModal(false)} title={t.catalogDialog}><Text style={styles.body}>{t.catalogDialogBody}</Text></Modal>
      <Toast visible={toast} tone="success" message={t.catalogDone} onDismiss={() => setToast(false)} />
    </ScrollView>
  );
}
