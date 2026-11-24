import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const OperationsScreen = lazyScreen(loadAdminScreens, (zone) => zone.OperationsScreen);

/** E12 · Estado operativo. */
export default function AdminOperationsRoute() { const { onNavigate } = useHostRoute(); return <OperationsScreen onNavigate={onNavigate} />; }
