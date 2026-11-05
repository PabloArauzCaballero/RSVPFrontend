import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from '../src/platform/providers';
import { SafeFrame } from '../src/platform/safe-frame';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar style="auto" />
        <SafeFrame><Stack screenOptions={{ headerShown: false }} /></SafeFrame>
      </AppProviders>
    </SafeAreaProvider>
  );
}
