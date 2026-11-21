import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const EventTypesScreen = lazyScreen(loadAdminScreens, (zone) => zone.EventTypesScreen);

/** E4 · Tipos de evento. */
export default function AdminEventTypesRoute() { const { onNavigate } = useHostRoute(); return <EventTypesScreen onNavigate={onNavigate} />; }
