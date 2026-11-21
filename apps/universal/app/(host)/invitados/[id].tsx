import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GuestDetailScreen = lazyScreen(loadHostScreens, (zone) => zone.GuestDetailScreen);

/** C23 · Detalle del invitado y su enlace personal. */
export default function GuestDetailRoute() { const { celebrationId, onNavigate, params } = useHostRoute(); return <GuestDetailScreen celebrationId={celebrationId} onNavigate={onNavigate} guestId={params['id']} />; }
