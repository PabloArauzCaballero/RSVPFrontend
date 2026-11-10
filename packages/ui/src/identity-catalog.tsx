import type { PropsWithChildren } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { radius, spacing, typography } from '@rsvp/design-tokens';
import type { AppLocale } from '@rsvp/i18n/server';
import { AvatarMark } from './avatar-mark';
import { CheckMark } from './scheme-check';
import { fonts } from './fonts';
import { Illustration } from './illustration';
import { ILLUSTRATION_GROUPS, ILLUSTRATION_NAMES, type IllustrationGroup } from './illustrations';
import { Logo } from './logo';
import { UiProvider, tracking, useTheme, type ColorScheme } from './theme';

const COPY: Record<AppLocale, Record<string, string>> = {
  'es-BO': {
    title: 'Identidad visual de DOne', intro: 'Todas las ilustraciones y recursos de marca en claro y oscuro, a varios tamaños. Es una página de revisión, no forma parte del producto.',
    light: 'Modo claro', dark: 'Modo oscuro', illustrations: 'Ilustraciones', sizes: 'Tamaños', logo: 'Logo', avatars: 'Avatares con la forma de la D', check: 'Cheque',
    host: 'Anfitrión', guest: 'Invitado', provider: 'Proveedor', admin: 'Administración', access: 'Acceso', system: 'Sistema'
  },
  'en-US': {
    title: 'DOne visual identity', intro: 'Every illustration and brand resource in light and dark, at several sizes. This is a review page, not part of the product.',
    light: 'Light mode', dark: 'Dark mode', illustrations: 'Illustrations', sizes: 'Sizes', logo: 'Logo', avatars: 'Avatars shaped like the D', check: 'Check',
    host: 'Host', guest: 'Guest', provider: 'Provider', admin: 'Admin', access: 'Access', system: 'System'
  }
};
const GROUPS: readonly IllustrationGroup[] = ['host', 'guest', 'provider', 'admin', 'access', 'system'];

function Heading({ level, children }: PropsWithChildren<{ level: 1 | 2 | 3 }>) {
  const { palette } = useTheme();
  const size = level === 1 ? typography.fontSize['2xl'] : level === 2 ? typography.fontSize.xl : typography.fontSize.base;
  const serif = level < 3;
  return <Text accessibilityRole="header" aria-level={level} style={{ color: palette.text, fontFamily: serif ? fonts.display : fonts.sans, fontSize: size, lineHeight: Math.round(size * 1.15), fontWeight: serif ? '500' : '600', letterSpacing: serif ? tracking(size, -0.02) : 0 }}>{children}</Text>;
}

function Caption({ children }: PropsWithChildren) {
  const { palette } = useTheme();
  return <Text style={{ color: palette.textMuted, fontFamily: fonts.sans, fontSize: typography.fontSize.sm }}>{children}</Text>;
}

function Panel({ scheme, copy }: { scheme: ColorScheme; copy: Record<string, string> }) {
  const { palette } = useTheme();
  return (
    <View testID={`identity-${scheme}`} style={{ backgroundColor: palette.canvas, padding: spacing[6], gap: spacing[8], borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border }}>
      <Heading level={2}>{scheme === 'light' ? copy.light! : copy.dark!}</Heading>

      <View style={{ gap: spacing[4] }}>
        <Heading level={3}>{copy.illustrations!}</Heading>
        {GROUPS.map((group) => (
          <View key={group} style={{ gap: spacing[2] }}>
            <Caption>{copy[group]!}</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] }}>
              {ILLUSTRATION_NAMES.filter((name) => ILLUSTRATION_GROUPS[name] === group).map((name) => (
                <View key={name} style={{ alignItems: 'center', gap: spacing[1], width: 124 }}>
                  <Illustration name={name} size="md" />
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
          <Illustration name="welcomeHost" size={32} />
          <Illustration name="welcomeHost" size="sm" />
          <Illustration name="welcomeHost" size="md" />
          <Illustration name="welcomeHost" size="lg" />
          <Illustration name="verified" size={32} />
          <Illustration name="verified" size="sm" />
          <Illustration name="verified" size="lg" />
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.logo!}</Heading>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[6] }}>
          <Logo height={32} />
          <Logo variant="mark" height={32} />
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Heading level={3}>{copy.check!}</Heading>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
          <CheckMark size={56} play={false} />
          <CheckMark size={40} tone="success" play={false} />
          <CheckMark size={28} play={false} />
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
