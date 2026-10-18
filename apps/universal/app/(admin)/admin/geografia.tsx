import { PendingModuleScreen } from '../../../src/admin/other-screens';
import { useHostRoute } from '../../../src/platform/route';

/** E6 · Geografía. */
export default function Route() { const { onNavigate } = useHostRoute(); return <PendingModuleScreen module="geography" onNavigate={onNavigate} />; }
