import type { PropsWithChildren } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { brand, onNight, radius, spacing, typography } from '@rsvp/design-tokens';
import type { AppLocale } from '@rsvp/i18n/server';
import { AvatarMark } from './avatar-mark';
import { BrandBand } from './brand-band';
import { HeroArt, MomentBackdrop } from './hero-art';
import { Illustration } from './illustration';
import { ILLUSTRATION_GROUPS, ILLUSTRATION_NAMES, type IllustrationGroup, type IllustrationTone } from './illustrations';
import { WeavePattern } from './pattern';
import { UiProvider, useTheme, type ColorScheme } from './theme';

const COPY: Record<AppLocale, Record<string, string>> = {
  'es-BO': {
    title: 'Identidad visual de DOne', intro: 'Todas las ilustraciones y recursos de marca en claro y oscuro, a varios tamaños. Es una página de revisión, no forma parte del producto.',
    light: 'Modo claro', dark: 'Modo oscuro', illustrations: 'Ilustraciones', sizes: 'Tamaños', tones: 'Tonos sobre fondos de marca', weave: 'Patrón de tejido', bands: 'Bandas de marca',
    hero: 'Composiciones de portada', avatars: 'Avatares con la forma de la D', moments: 'Fondos de momento', confirmed: 'Confirmación', published: 'Publicación',
    bandTitle: 'Listo para vender', bandBody: 'Tu perfil está verificado y tus ofertas ya se ven.', sample: 'Texto de muestra sobre el patrón', sampleBody: 'Comprueba que se lee con comodidad.',
    host: 'Anfitrión', guest: 'Invitado', provider: 'Proveedor', admin: 'Administración', access: 'Acceso', system: 'Sistema', night: 'Noche', brand: 'Azul', momentTitle: 'Publicada'
  },
  'en-US': {
    title: 'DOne visual identity', intro: 'Every illustration and brand resource in light and dark, at several sizes. This is a review page, not part of the product.',
    light: 'Light mode', dark: 'Dark mode', illustrations: 'Illustrations', sizes: 'Sizes', tones: 'Tones over brand grounds', weave: 'Weave pattern', bands: 'Brand bands',
    hero: 'Cover compositions', avatars: 'Avatars shaped like the D', moments: 'Moment backgrounds', confirmed: 'Confirmation', published: 'Publication',
    bandTitle: 'Ready to sell', bandBody: 'Your profile is verified and your offers are live.', sample: 'Sample text over the pattern', sampleBody: 'Check that it reads comfortably.',
    host: 'Host', guest: 'Guest', provider: 'Provider', admin: 'Admin', access: 'Access', system: 'System', night: 'Night', brand: 'Blue', momentTitle: 'Published'
  }
};
const GROUPS: readonly IllustrationGroup[] = ['host', 'guest', 'provider', 'admin', 'access', 'system'];
const TONES_ON_GROUND: readonly { tone: IllustrationTone; ground: string }[] = [{ tone: 'onBrand', ground: brand.azul }, { tone: 'onDark', ground: brand.noche }];

function Heading({ level, children }: PropsWithChildren<{ level: 1 | 2 | 3 }>) {
  const { palette } = useTheme();
  const size = level === 1 ? typography.fontSize.xl : level === 2 ? typography.fontSize.lg : typography.fontSize.base;
  return <Text accessibilityRole="header" aria-level={level} style={{ color: palette.text, fontSize: size, fontWeight: '800', letterSpacing: -0.4 }}>{children}</Text>;
}

function Caption({ children }: PropsWithChildren) {
  const { palette } = useTheme();
  return <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.sm }}>{children}</Text>;
}

function Panel({ scheme, copy }: { scheme: ColorScheme; copy: Record<string, string> }) {
  const { palette } = useTheme();
  const box = { borderRadius: radius.lg, overflow: 'hidden' as const, position: 'relative' as const };
  return (
    <View testID={`identity-${scheme}`} style={{ backgroundColor: palette.canvas, padding: spacing[5], gap: spacing[6], borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border }}>
      <Heading level={2}>{scheme === 'light' ? copy.light! : copy.dark!}</Heading>

      <View style={{ gap: spacing[4] }}>
        <Heading level={3}>{copy.illustrations!}</Heading>
        {GROUPS.map((group) => (
          <View key={group} style={{ gap: spacing[2] }}>
            <Caption>{copy[group]!}</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] }}>
              {ILLUSTRATION_NAMES.filter((name) => ILLUSTRATION_GROUPS[name] === group).map((name) => (
                <View key={name} style={{ alignItems: 'center', gap: spacing[1], width: 124 }}>
                  <Illustration name={name} tone="auto" size="md" />
                  <Caption>{name}</Caption>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.sizes!}</Heading>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing[5] }}>
          <Illustration name="welcomeHost" tone="auto" size={32} />
          <Illustration name="welcomeHost" tone="auto" size="sm" />
          <Illustration name="welcomeHost" tone="auto" size="md" />
          <Illustration name="welcomeHost" tone="auto" size="lg" />
          <Illustration name="verified" tone="auto" size={32} />
          <Illustration name="verified" tone="auto" size="sm" />
          <Illustration name="verified" tone="auto" size="lg" />
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.tones!}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
          {TONES_ON_GROUND.map(({ tone, ground }) => (
            <View key={tone} style={{ backgroundColor: ground, borderRadius: radius.lg, padding: spacing[4], flexDirection: 'row', gap: spacing[3] }}>
              {(['published', 'noAccess', 'verifying'] as const).map((name) => <Illustration key={name} name={name} tone={tone} size="sm" />)}
            </View>
          ))}
          {scheme === 'light' ? (
            <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, padding: spacing[4], flexDirection: 'row', gap: spacing[3], borderWidth: 1, borderColor: palette.border }}>
              {(['published', 'noAccess', 'verifying'] as const).map((name) => <Illustration key={name} name={name} tone="night" size="sm" />)}
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.weave!}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
          {([['brand', palette.surface, palette.text], ['onDark', brand.noche, onNight], ['onBrand', brand.azul, onNight]] as const).map(([tone, ground, ink]) => (
            <View key={tone} style={[box, { backgroundColor: ground, width: 260, height: 150, padding: spacing[4], justifyContent: 'center', gap: 4 }]}>
              <WeavePattern tone={tone} />
              <Text style={{ color: ink, fontSize: typography.fontSize.lg, fontWeight: '800' }}>{copy.sample!}</Text>
              <Text style={{ color: ink, fontSize: typography.fontSize.sm }}>{copy.sampleBody!}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.bands!}</Heading>
        {(['night', 'brand'] as const).map((tone) => (
          <BrandBand key={tone} tone={tone} art={tone === 'night' ? 'ready' : 'cover'}>
            <Text accessibilityRole="header" aria-level={4} style={{ color: onNight, fontSize: typography.fontSize.xl, fontWeight: '800', letterSpacing: -0.5 }}>{copy.bandTitle!}</Text>
            <Text style={{ color: onNight, fontSize: typography.fontSize.base }}>{copy.bandBody!}</Text>
          </BrandBand>
        ))}
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.hero!}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
          <View style={[box, { backgroundColor: brand.azul, width: 320, height: 200 }]}><HeroArt variant="cover" tone="onBrand" /></View>
          <View style={[box, { backgroundColor: brand.noche, width: 320, height: 200 }]}><HeroArt variant="cover" tone="onDark" /></View>
          <View style={[box, { backgroundColor: brand.azul, width: 200, height: 260 }]}><HeroArt variant="auth" tone="onBrand" /></View>
          <View style={[box, { backgroundColor: brand.noche, width: 480, height: 180 }]}><HeroArt variant="ready" tone="onDark" /></View>
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.avatars!}</Heading>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing[4] }}>
          {['Flores y Eventos Sol', 'Banquetes La Paz', 'DJ Andino', 'Foto Ximena', 'Pastelería Dulce Arco'].map((name) => <AvatarMark key={name} name={name} size={56} />)}
          <AvatarMark name="Mesa Linda" size={40} />
          <AvatarMark name="Mesa Linda" size={28} />
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.moments!}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
          {(['confirmed', 'published'] as const).map((variant) => (
            <View key={variant} style={[box, { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, width: 300, height: 260, alignItems: 'center', justifyContent: 'center', padding: spacing[4] }]}>
              <MomentBackdrop variant={variant} />
              <Text style={{ color: palette.text, fontSize: typography.fontSize.base, fontWeight: '800', textAlign: 'center' }}>{variant === 'confirmed' ? copy.confirmed! : copy.momentTitle!}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Review page for the whole visual identity (dev only): every illustration and brand resource, light and dark, several sizes. */
export function IdentityCatalog({ locale = 'es-BO' }: { locale?: AppLocale }) {
  const copy = COPY[locale];
  return (
    <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[5] }}>
      <UiProvider scheme="light">
        <View style={{ gap: spacing[2], maxWidth: 720 }}><Heading level={1}>{copy.title!}</Heading><Caption>{copy.intro!}</Caption></View>
        <Panel scheme="light" copy={copy} />
      </UiProvider>
      <UiProvider scheme="dark"><Panel scheme="dark" copy={copy} /></UiProvider>
    </ScrollView>
  );
}
