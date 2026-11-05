import { NotificationsScreen } from '../../src/host/guests/notifications-screen';
import { useHostRoute } from '../../src/platform/route';

/** C31 · Centro de notificaciones. */
export default function NotificationsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <NotificationsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
