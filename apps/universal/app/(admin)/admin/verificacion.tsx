import { VerificationScreen } from '../../../src/admin/queues';
import { useHostRoute } from '../../../src/platform/route';

/** E7 · Verificación de proveedores. */
export default function AdminVerificationRoute() { const { onNavigate } = useHostRoute(); return <VerificationScreen onNavigate={onNavigate} />; }
