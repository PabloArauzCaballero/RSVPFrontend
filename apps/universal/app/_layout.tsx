import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../src/platform/providers';

export default function RootLayout() {
  return <AppProviders><StatusBar style="auto" /><Stack screenOptions={{ headerShown: false }} /></AppProviders>;
}
