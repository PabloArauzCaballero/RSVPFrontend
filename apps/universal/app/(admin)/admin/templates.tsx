import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const TemplatesAdminScreen = lazyScreen(loadAdminScreens, (zone) => zone.TemplatesAdminScreen);

/** E3 · Templates. */
export default function AdminTemplatesRoute() { const { onNavigate } = useHostRoute(); return <TemplatesAdminScreen onNavigate={onNavigate} />; }
