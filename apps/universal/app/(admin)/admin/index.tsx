import { DashboardScreen } from '../../../src/admin/other-screens';
import { useHostRoute } from '../../../src/platform/route';

/** E2 · Resumen. */
export default function AdminDashboardRoute() { const { onNavigate } = useHostRoute(); return <DashboardScreen onNavigate={onNavigate} />; }
