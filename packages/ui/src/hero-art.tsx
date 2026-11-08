import { View, type ViewStyle } from 'react-native';
import { ArtSvg } from './art-svg';
import { HERO_ART, MOMENT_ART, type HeroVariant, type MomentVariant } from './brand-art';
import { resolveTone, type IllustrationTone } from './illustrations';
import { useTheme } from './theme';

export interface HeroArtProps {
  /** `cover` guest cover (nested arches and the amber light), `auth` login and sign-up panels (the D and the steps), `ready` the "Ready to sell" band. */
  variant: HeroVariant;
  /** `onBrand` over the blue (default), `onDark` over the night, `brand`/`night` over light grounds, `auto` follows the scheme. */
  tone?: IllustrationTone;
  /** The art fills its box and is cropped (`xMidYMid slice`); give the box a size through `style`. */
  style?: ViewStyle;
}

/** Decorative composition for covers and bands. It never carries meaning, so it is hidden from assistive technology; the text next to it does the talking. */
export function HeroArt({ variant, tone = 'onBrand', style }: HeroArtProps) {
  const { scheme } = useTheme();
  const art = HERO_ART[variant];
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: '100%', height: '100%' }, style]}>
      <ArtSvg shapes={art.shapes} tone={resolveTone(tone, scheme)} viewWidth={art.width} viewHeight={art.height} width="100%" height="100%" slice dataName={`hero-${variant}`} />
    </View>
  );
}

export interface MomentBackdropProps {
  /** `confirmed` rings of light behind the check, `published` an arch of rays. */
  variant: MomentVariant;
  tone?: IllustrationTone;
}

/** Static background for a milestone (confirmation, publication): it fills its parent, sits behind the content and never moves. */
export function MomentBackdrop({ variant, tone = 'auto' }: MomentBackdropProps) {
  const { scheme } = useTheme();
  const art = MOMENT_ART[variant];
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <ArtSvg shapes={art.shapes} tone={resolveTone(tone, scheme)} viewWidth={art.width} viewHeight={art.height} width="100%" height="100%" slice dataName={`moment-${variant}`} />
    </View>
  );
}
