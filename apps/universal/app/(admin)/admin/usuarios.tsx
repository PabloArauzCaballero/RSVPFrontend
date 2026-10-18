import { PendingModuleScreen } from '../../../src/admin/other-screens';
import { useHostRoute } from '../../../src/platform/route';

/** E9 · Usuarios. */
export default function Route() { const { onNavigate } = useHostRoute(); return <PendingModuleScreen module="users" onNavigate={onNavigate} />; }
