import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const RequestsScreen = lazyScreen(loadHostScreens, (zone) => zone.RequestsScreen);

/** C26 · Bandeja de solicitudes de acompañantes. */
export default function RequestsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <RequestsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
