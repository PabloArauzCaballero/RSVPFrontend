import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const NotificationsScreen = lazyScreen(loadHostScreens, (zone) => zone.NotificationsScreen);

/** C31 · Centro de notificaciones. */
export default function NotificationsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <NotificationsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
