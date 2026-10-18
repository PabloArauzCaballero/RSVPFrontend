import { OnboardingScreen } from '../../../src/host/onboarding';
import { useHostRoute } from '../../../src/platform/route';

/** C3–C5 · Alta en tres pasos. */
export default function OnboardingRoute() { const { celebrationId, onNavigate, params } = useHostRoute(); return <OnboardingScreen step={Number(params['step']) || 1} celebrationId={celebrationId} onNavigate={onNavigate} />; }
