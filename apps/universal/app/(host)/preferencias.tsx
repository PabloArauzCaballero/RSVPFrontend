import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const PreferencesScreen = lazyScreen(loadHostScreens, (zone) => zone.PreferencesScreen);

/** Preferencias de avisos por canal. */
export default function PreferencesRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <PreferencesScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
