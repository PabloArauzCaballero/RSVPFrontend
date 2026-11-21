import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const PushPermissionsScreen = lazyScreen(loadHostScreens, (zone) => zone.PushPermissionsScreen);

/** Permiso de avisos push en este dispositivo. */
export default function PushPermissionsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <PushPermissionsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
