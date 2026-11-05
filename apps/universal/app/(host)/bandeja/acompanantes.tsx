import { RequestsScreen } from '../../../src/host/guests/requests-screen';
import { useHostRoute } from '../../../src/platform/route';

/** C26 · Bandeja de solicitudes de acompañantes. */
export default function RequestsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <RequestsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
