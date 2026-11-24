import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useRouter } from 'expo-router';

const OnboardingScreen = lazyScreen(loadProviderScreens, (zone) => zone.OnboardingScreen);

/** D1 · Alta del proveedor. */
export default function OnboardingRoute() { const router = useRouter(); return <OnboardingScreen onDone={() => router.replace('/portal')} />; }
