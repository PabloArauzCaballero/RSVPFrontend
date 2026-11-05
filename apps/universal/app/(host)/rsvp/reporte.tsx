import { ReportScreen } from '../../../src/host/guests/report-screen';
import { useHostRoute } from '../../../src/platform/route';

/** C24 · Reporte de RSVP exportable. */
export default function ReportRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <ReportScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
