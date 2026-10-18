import { PendingModuleScreen } from '../../../src/admin/other-screens';
import { useHostRoute } from '../../../src/platform/route';

/** E10 · Organizaciones. */
export default function Route() { const { onNavigate } = useHostRoute(); return <PendingModuleScreen module="organizations" onNavigate={onNavigate} />; }
