import { PreferencesScreen } from '../../src/host/guests/preferences-screen';
import { useHostRoute } from '../../src/platform/route';

/** Preferencias de avisos por canal. */
export default function PreferencesRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <PreferencesScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
