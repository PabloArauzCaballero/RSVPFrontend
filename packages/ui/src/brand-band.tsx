import type { PropsWithChildren } from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';
import { brand, radius, spacing } from '@rsvp/design-tokens';
import type { HeroVariant } from './brand-art';
import { HeroArt } from './hero-art';
import { WeavePattern } from './pattern';

export interface BrandBandProps {
  /** `night` (default) or the electric `brand` blue. Text on it is white (AA on both). */
  tone?: 'night' | 'brand';
  /** Optional composition on the right; it is dropped under 720 px so the text always has the room. */
  art?: HeroVariant;
  style?: ViewStyle;
}

const GROUND = { night: brand.noche, brand: brand.azul } as const;
const WIDE = 720;
const ART_SHARE = 0.4;

/**
 * A committed band of the brand ("Ready to sell", covers, closing blocks): night or blue ground, the woven texture
 * behind, optional art on the right. The children are the content (white text); the texture and art are decorative.
 */
export function BrandBand({ tone = 'night', art, style, children }: PropsWithChildren<BrandBandProps>) {
  const { width } = useWindowDimensions();
  const showArt = art !== undefined && width >= WIDE;
  const artTone = tone === 'night' ? 'onDark' : 'onBrand';
  return (
    <View style={[{ backgroundColor: GROUND[tone], borderRadius: radius.xl, overflow: 'hidden', position: 'relative', minHeight: art ? 184 : undefined, justifyContent: 'center' }, style]}>
      <WeavePattern tone={artTone} />
      {showArt ? <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${ART_SHARE * 100}%` }}><HeroArt variant={art} tone={artTone} /></View> : null}
      <View style={{ padding: spacing[6], gap: spacing[3], paddingRight: showArt ? `${ART_SHARE * 100 + 4}%` : spacing[6] }}>{children}</View>
    </View>
  );
}
