import { useRouter } from 'expo-router';
import { OnboardingScreen } from '../../../src/provider/overview-screen';

/** D1 · Alta del proveedor. */
export default function OnboardingRoute() { const router = useRouter(); return <OnboardingScreen onDone={() => router.replace('/portal')} />; }
