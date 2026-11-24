import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const MetricsScreen = lazyScreen(loadAdminScreens, (zone) => zone.MetricsScreen);

/** E11 · Métricas. */
export default function Route() { const { onNavigate } = useHostRoute(); return <MetricsScreen onNavigate={onNavigate} />; }
