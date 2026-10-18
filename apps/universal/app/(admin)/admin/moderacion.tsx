import { PendingModuleScreen } from '../../../src/admin/other-screens';
import { useHostRoute } from '../../../src/platform/route';

/** E8 · Moderación. */
export default function Route() { const { onNavigate } = useHostRoute(); return <PendingModuleScreen module="moderation" onNavigate={onNavigate} />; }
