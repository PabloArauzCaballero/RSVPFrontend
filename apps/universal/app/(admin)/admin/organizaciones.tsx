import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const OrganizationsScreen = lazyScreen(loadAdminScreens, (zone) => zone.OrganizationsScreen);

/** E10 · Organizaciones. */
export default function Route() { const { onNavigate } = useHostRoute(); return <OrganizationsScreen onNavigate={onNavigate} />; }
