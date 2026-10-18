import { PendingModuleScreen } from '../../../src/admin/other-screens';
import { useHostRoute } from '../../../src/platform/route';

/** E11 · Métricas. */
export default function Route() { const { onNavigate } = useHostRoute(); return <PendingModuleScreen module="metrics" onNavigate={onNavigate} />; }
