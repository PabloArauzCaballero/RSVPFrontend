import Svg, { Path } from 'react-native-svg';
import { logo } from '@rsvp/design-tokens';
import { LOGO_TONES, LOGO_VIEWBOX, type LogoProps } from './logo';

/** Native: the same artwork as the web logo, drawn with react-native-svg. */
export function Logo({ variant = 'wordmark', tone = 'brand', height = 28, label = 'DOne', decorative = false }: LogoProps) {
  const colors = LOGO_TONES[tone];
  const a11y = decorative ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const } : { accessibilityRole: 'image' as const, accessibilityLabel: label };
  if (variant === 'mark') {
    return <Svg {...a11y} viewBox="0 0 86 100" height={height} width={Math.round(height * 0.86)}><Path fill={colors.mark} d={logo.symbol} /></Svg>;
  }
  return (
    <Svg {...a11y} viewBox={logo.viewBox} height={height} width={Math.round((height * LOGO_VIEWBOX.width) / LOGO_VIEWBOX.height)}>
      <Path fill={colors.mark} d={logo.mark} />
      <Path fill={colors.word} d={logo.word} />
    </Svg>
  );
}
