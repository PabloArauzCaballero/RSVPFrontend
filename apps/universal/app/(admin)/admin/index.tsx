import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const DashboardScreen = lazyScreen(loadAdminScreens, (zone) => zone.DashboardScreen);

/** E2 · Resumen. */
export default function AdminDashboardRoute() { const { onNavigate } = useHostRoute(); return <DashboardScreen onNavigate={onNavigate} />; }
