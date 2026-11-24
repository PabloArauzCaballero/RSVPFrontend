import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const ModesScreen = lazyScreen(loadHostScreens, (zone) => zone.ModesScreen);

/** C18 · Modos AUTO_ACCEPT / RESTRICTED. */
export default function ModesRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <ModesScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
