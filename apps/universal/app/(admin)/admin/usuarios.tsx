import { UsersScreen } from '../../../src/admin/insight';
import { useHostRoute } from '../../../src/platform/route';

/** E9 · Usuarios. */
export default function Route() { const { onNavigate } = useHostRoute(); return <UsersScreen onNavigate={onNavigate} />; }
