import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const ProductsScreen = lazyScreen(loadAdminScreens, (zone) => zone.ProductsScreen);

/** R8b · Moderación de productos. */
export default function Route() { const { onNavigate } = useHostRoute(); return <ProductsScreen onNavigate={onNavigate} />; }
