import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const ReportScreen = lazyScreen(loadHostScreens, (zone) => zone.ReportScreen);

/** C24 · Reporte de RSVP exportable. */
export default function ReportRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <ReportScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
