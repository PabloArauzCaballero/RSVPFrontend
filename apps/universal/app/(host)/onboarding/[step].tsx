import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const OnboardingScreen = lazyScreen(loadHostScreens, (zone) => zone.OnboardingScreen);

/** C3–C5 · Alta en tres pasos. */
export default function OnboardingRoute() { const { celebrationId, onNavigate, params } = useHostRoute(); return <OnboardingScreen step={Number(params['step']) || 1} celebrationId={celebrationId} onNavigate={onNavigate} />; }
