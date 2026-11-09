import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useBrandFonts } from '../src/platform/fonts';
import { AppProviders } from '../src/platform/providers';
import { SafeFrame } from '../src/platform/safe-frame';

export default function RootLayout() {
  // Native waits for the bundled brand font so no screen paints once in the system face and then jumps.
  const fontsReady = useBrandFonts();
  if (!fontsReady) return null;
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar style="auto" />
        <SafeFrame><Stack screenOptions={{ headerShown: false }} /></SafeFrame>
      </AppProviders>
    </SafeAreaProvider>
  );
}
