import { PendingModuleScreen } from '../../../src/admin/other-screens';
import { useHostRoute } from '../../../src/platform/route';

/** E5 · Categorías. */
export default function Route() { const { onNavigate } = useHostRoute(); return <PendingModuleScreen module="categories" onNavigate={onNavigate} />; }
