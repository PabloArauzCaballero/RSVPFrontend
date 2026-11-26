import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@rsvp/ui';
import { useDocumentLanguage } from '../src/platform/document-language';
import { errorBoundaryFor } from '../src/platform/error-boundary';
import { useBrandFonts } from '../src/platform/fonts';
import { AppProviders, useLocale } from '../src/platform/providers';
import { SafeFrame } from '../src/platform/safe-frame';

/** M11: a render error anywhere in the app ends here (unless a group catches it first): a localized retry, and a report to telemetry. */
export const ErrorBoundary = errorBoundaryFor('root');

/** `<html lang>` follows the language on screen (web); nothing on native. */
function DocumentLanguage() { useDocumentLanguage(useLocale()); return null; }

/** Expo's navigators draw a surface of their own, including while a route is suspended. */
function AppNavigation() {
  const { scheme, palette } = useTheme();
  const dark = scheme === 'dark';
  const navigationTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: palette.canvas, card: palette.surface, text: palette.text, border: palette.border, primary: palette.primary }
    };
  }, [dark, palette]);
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <SafeFrame><Stack screenOptions={{ headerShown: false }} /></SafeFrame>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Native waits for the bundled brand font so no screen paints once in the system face and then jumps.
  const fontsReady = useBrandFonts();
  if (!fontsReady) return null;
  return (
    <SafeAreaProvider>
      <AppProviders>
        <DocumentLanguage />
        <AppNavigation />
      </AppProviders>
    </SafeAreaProvider>
  );
}
