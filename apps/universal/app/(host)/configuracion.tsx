import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const SettingsScreen = lazyScreen(loadHostScreens, (zone) => zone.SettingsScreen);

/** C17 · Configuración. */
export default function SettingsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <SettingsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
