import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { radius, shadow, spacing, typography } from '@rsvp/design-tokens';
import { fonts } from './fonts';
import { useTheme } from './theme';

export interface OverflowMenuItem {
  key: string;
  /** Already translated. */
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  testID?: string;
}

export interface OverflowMenuProps {
  items: readonly OverflowMenuItem[];
  /** Accessible name of the trigger (translated). Defaults to `ui.moreOptions`. */
  label?: string;
  testID?: string;
}

const TOUCH = 44;
/** `react-dom` is only touched on web, so native bundles never evaluate it. */
const portal = (node: ReactElement): ReactElement => (require('react-dom') as { createPortal: (child: ReactElement, target: Element) => ReactElement }).createPortal(node, document.body);
const web = Platform.OS === 'web';
type KeyEvent = { key: string; preventDefault: () => void };
type Focusable = { focus?: () => void } | null;

/**
 * Secondary actions behind a "⋯" button. Web: popover with role=menu / menuitem, arrows + Home/End move the focus,
 * Escape closes and returns the focus to the trigger, Tab or an outside press close it. Native: a modal sheet of the same items.
 * Renders nothing when there are no items.
 */
export function OverflowMenu({ items, label, testID }: OverflowMenuProps) {
  const { palette, strings } = useTheme();
  const [open, setOpen] = useState(false);
  const trigger = useRef<Focusable>(null);
  const refs = useRef<Focusable[]>([]);
  const menu = useRef<{ contains?: (node: Node) => boolean } | null>(null);
  const [anchor, setAnchor] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const name = label ?? strings.moreOptions;
  const enabled = items.map((item, index) => (item.disabled ? -1 : index)).filter((index) => index >= 0);

  const close = (restoreFocus: boolean) => { setOpen(false); if (restoreFocus) trigger.current?.focus?.(); };
  // On web the popover leaves the row's stacking context (rows animate in with transform/opacity, and later rows would paint over it): it is portalled to <body> and fixed under the trigger.
  const toggle = () => {
    if (!open && web) {
      const box = (trigger.current as unknown as HTMLElement | null)?.getBoundingClientRect?.();
      if (box) {
        // Opens downward; when the items would not fit below the trigger it opens upward, so focusing the first item never has to scroll the page (a scroll closes the menu).
        const height = items.length * TOUCH + spacing[2];
        const right = Math.max(8, window.innerWidth - box.right);
        const fitsBelow = box.bottom + spacing[1] + height <= window.innerHeight - 8;
        setAnchor(fitsBelow || box.top < height ? { top: box.bottom + spacing[1], right } : { bottom: window.innerHeight - box.top + spacing[1], right });
      }
    }
    setOpen((value) => !value);
  };
  const focusAt = (index: number) => (refs.current[index]?.focus as ((options?: { preventScroll: boolean }) => void) | undefined)?.call(refs.current[index], { preventScroll: true });
  useEffect(() => { if (open && web && enabled[0] !== undefined) focusAt(enabled[0]); }, [open]);
  useEffect(() => {
    if (!open || !web) return undefined;
    const outside = (event: Event) => {
      const target = event.target as Node | null;
      const root = (trigger.current as unknown as HTMLElement | null)?.parentElement;
      if (root && target && !root.contains(target) && !menu.current?.contains?.(target)) setOpen(false);
    };
    const away = () => setOpen(false);
    document.addEventListener('mousedown', outside);
    // A scroll that happened just before the tap (the page bringing the trigger into view) is still queued and fires on the next frame:
    // it must not dismiss the menu that tap just opened, so the listener starts two frames later.
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => window.addEventListener('scroll', away, true)); });
    window.addEventListener('resize', away);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('mousedown', outside); window.removeEventListener('scroll', away, true); window.removeEventListener('resize', away); };
  }, [open]);

  if (items.length === 0) return null;

  const onKey = (event: KeyEvent, index: number) => {
    const at = enabled.indexOf(index);
    const move = (target: number | undefined) => { if (target !== undefined) { event.preventDefault(); focusAt(target); } };
    if (event.key === 'ArrowDown') move(enabled[(at + 1) % enabled.length]);
    else if (event.key === 'ArrowUp') move(enabled[(at - 1 + enabled.length) % enabled.length]);
    else if (event.key === 'Home') move(enabled[0]);
    else if (event.key === 'End') move(enabled[enabled.length - 1]);
    else if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'Tab') setOpen(false);
  };
  const choose = (item: OverflowMenuItem) => { if (item.disabled) return; close(true); item.onPress(); };
  const focusStyle = web ? ({ outlineColor: palette.primary, outlineWidth: 2, outlineOffset: -2 } as object) : {};

  const list = items.map((item, index) => (
    <Pressable
      key={item.key}
      ref={(node) => { refs.current[index] = node as Focusable; }}
      role="menuitem"
      testID={item.testID}
      accessibilityLabel={item.label}
      accessibilityState={{ disabled: Boolean(item.disabled) }}
      disabled={item.disabled}
      onPress={() => choose(item)}
      {...(web ? ({ onKeyDown: (event: KeyEvent) => onKey(event, index), tabIndex: -1 } as object) : {})}
      style={[{ minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: spacing[4], opacity: item.disabled ? 0.5 : 1 }, focusStyle]}
    >
      <Text style={{ color: item.destructive ? palette.danger : palette.text, fontFamily: fonts.sans, fontSize: typography.fontSize.base, fontWeight: '500' }}>{item.label}</Text>
    </Pressable>
  ));

  return (
    <View style={{ position: 'relative', alignSelf: 'flex-start', zIndex: open ? 30 : 0 }}>
      <Pressable
        ref={(node) => { trigger.current = node as Focusable; }}
        role="button"
        accessibilityLabel={name}
        aria-haspopup="menu"
        aria-expanded={open}
        testID={testID}
        onPress={toggle}
        {...(web ? ({ onKeyDown: (event: KeyEvent) => { if (event.key === 'Escape' && open) close(true); } } as object) : {})}
        style={[{ width: TOUCH, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.button, borderWidth: 1, borderColor: palette.fieldBorder, backgroundColor: palette.surface }, web ? ({ outlineColor: palette.primary, outlineWidth: 2, outlineOffset: 2 } as object) : {}]}
      >
        <View aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ flexDirection: 'row', gap: 3 }}>{[0, 1, 2].map((dot) => <View key={dot} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: palette.text }} />)}</View>
      </Pressable>
      {web ? (
        open && anchor ? portal(
          <View ref={(node) => { menu.current = node as unknown as typeof menu.current; }} role="menu" aria-label={name} style={{ position: 'fixed', ...(anchor.top !== undefined ? { top: anchor.top } : { bottom: anchor.bottom }), right: anchor.right, minWidth: 200, zIndex: 1000, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, paddingVertical: spacing[1], boxShadow: shadow.lg } as object}>{list}</View>
        ) : null
      ) : (
        <Modal transparent visible={open} animationType="fade" onRequestClose={() => close(true)}>
          <Pressable accessibilityLabel={strings.close} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: palette.scrim }} onPress={() => close(true)}>
            <View role="menu" accessibilityLabel={name} style={{ backgroundColor: palette.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing[3], paddingBottom: spacing[6] }}>{list}</View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
