import { Text, View } from 'react-native';
import { avatars } from '@rsvp/design-tokens';
import { fonts } from './fonts';
import { useTheme } from './theme';

export interface AvatarMarkProps {
  name: string;
  /** Height in px; the width follows the D (0.86 : 1). */
  size?: number;
}

const LINKS = new Set(['y', 'e', 'de', 'del', 'la', 'las', 'el', 'los', 'the', 'of', 'and']);
const initialsOf = (name: string): string => name.trim().split(/\s+/).filter((word) => word && !LINKS.has(word.toLowerCase())).slice(0, 2).map((word) => [...word][0]?.toUpperCase() ?? '').join('');
const hashOf = (name: string): number => [...name].reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0);

/**
 * Avatar with the shape of the D (rounded corners on the left, a half circle on the right) for providers without a photo.
 * Initials in ink-weight pastel text on one of four pastel grounds, chosen from the name so the same provider keeps the same
 * hue in light and dark. Decorative: the name is always next to it in text.
 */
export function AvatarMark({ name, size = 48 }: AvatarMarkProps) {
  const { scheme } = useTheme();
  const grounds = avatars[scheme];
  const ground = grounds[hashOf(name) % grounds.length]!;
  const small = size * 0.1;
  return (
    <View
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
      style={{ width: Math.round(size * 0.86), height: size, backgroundColor: ground.bg, borderTopLeftRadius: small, borderBottomLeftRadius: small, borderTopRightRadius: size / 2, borderBottomRightRadius: size / 2, alignItems: 'center', justifyContent: 'center', paddingRight: size * 0.05 }}
    >
      <Text style={{ color: ground.fg, fontFamily: fonts.sans, fontSize: Math.round(size * 0.34), fontWeight: '600', letterSpacing: -0.2 }}>{initialsOf(name)}</Text>
    </View>
  );
}
