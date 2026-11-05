import { PushPermissionsScreen } from '../../src/push/permissions-screen';
import { useHostRoute } from '../../src/platform/route';

/** Permiso de avisos push en este dispositivo. */
export default function PushPermissionsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <PushPermissionsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
