import { SettingsScreen } from '../../src/host/settings-screen';
import { useHostRoute } from '../../src/platform/route';

/** C17 · Configuración. */
export default function SettingsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <SettingsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
