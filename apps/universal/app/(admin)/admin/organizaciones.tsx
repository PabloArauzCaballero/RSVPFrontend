import { OrganizationsScreen } from '../../../src/admin/insight';
import { useHostRoute } from '../../../src/platform/route';

/** E10 · Organizaciones. */
export default function Route() { const { onNavigate } = useHostRoute(); return <OrganizationsScreen onNavigate={onNavigate} />; }
