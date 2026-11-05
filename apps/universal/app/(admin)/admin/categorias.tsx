import { CategoriesScreen } from '../../../src/admin/catalog';
import { useHostRoute } from '../../../src/platform/route';

/** E5 · Categorías. */
export default function Route() { const { onNavigate } = useHostRoute(); return <CategoriesScreen onNavigate={onNavigate} />; }
