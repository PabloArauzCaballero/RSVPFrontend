import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const UsersScreen = lazyScreen(loadAdminScreens, (zone) => zone.UsersScreen);

/** E9 · Usuarios. */
export default function Route() { const { onNavigate } = useHostRoute(); return <UsersScreen onNavigate={onNavigate} />; }
