import { ModesScreen } from '../../src/host/modes-screen';
import { useHostRoute } from '../../src/platform/route';

/** C18 · Modos AUTO_ACCEPT / RESTRICTED. */
export default function ModesRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <ModesScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
