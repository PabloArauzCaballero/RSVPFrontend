import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const ReportsScreen = lazyScreen(loadAdminScreens, (zone) => zone.ReportsScreen);

/** F7 · Denuncias de invitaciones públicas y vista previa de lo oculto. */
export default function Route() { const { onNavigate } = useHostRoute(); return <ReportsScreen onNavigate={onNavigate} />; }
