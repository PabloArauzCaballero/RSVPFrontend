import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDocumentLanguage } from '../src/platform/document-language';
import { useBrandFonts } from '../src/platform/fonts';
import { AppProviders, useLocale } from '../src/platform/providers';
import { SafeFrame } from '../src/platform/safe-frame';

/** `<html lang>` follows the language on screen (web); nothing on native. */
function DocumentLanguage() { useDocumentLanguage(useLocale()); return null; }

export default function RootLayout() {
  // Native waits for the bundled brand font so no screen paints once in the system face and then jumps.
  const fontsReady = useBrandFonts();
  if (!fontsReady) return null;
  return (
    <SafeAreaProvider>
      <AppProviders>
        <DocumentLanguage />
        <StatusBar style="auto" />
        <SafeFrame><Stack screenOptions={{ headerShown: false }} /></SafeFrame>
      </AppProviders>
    </SafeAreaProvider>
  );
}
