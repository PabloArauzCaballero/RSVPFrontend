import { TemplatesAdminScreen } from '../../../src/admin/templates';
import { useHostRoute } from '../../../src/platform/route';

/** E3 · Templates. */
export default function AdminTemplatesRoute() { const { onNavigate } = useHostRoute(); return <TemplatesAdminScreen onNavigate={onNavigate} />; }
