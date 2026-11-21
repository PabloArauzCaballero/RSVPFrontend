import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const CategoriesScreen = lazyScreen(loadAdminScreens, (zone) => zone.CategoriesScreen);

/** E5 · Categorías. */
export default function Route() { const { onNavigate } = useHostRoute(); return <CategoriesScreen onNavigate={onNavigate} />; }
