import { SummaryScreen } from '../../src/host/guests/summary-screen';
import { useHostRoute } from '../../src/platform/route';

/** C6 · Resumen RSVP del panel. */
export default function SummaryRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <SummaryScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
