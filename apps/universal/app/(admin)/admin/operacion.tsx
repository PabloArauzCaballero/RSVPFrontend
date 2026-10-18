import { OperationsScreen } from '../../../src/admin/other-screens';
import { useHostRoute } from '../../../src/platform/route';

/** E12 · Estado operativo. */
export default function AdminOperationsRoute() { const { onNavigate } = useHostRoute(); return <OperationsScreen onNavigate={onNavigate} />; }
