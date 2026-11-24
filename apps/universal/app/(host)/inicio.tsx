import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const SummaryScreen = lazyScreen(loadHostScreens, (zone) => zone.SummaryScreen);

/** C6 · Resumen RSVP del panel. */
export default function SummaryRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <SummaryScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
