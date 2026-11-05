import { GuestDetailScreen } from '../../../src/host/guests/guest-detail-screen';
import { useHostRoute } from '../../../src/platform/route';

/** C23 · Detalle del invitado y su enlace personal. */
export default function GuestDetailRoute() { const { celebrationId, onNavigate, params } = useHostRoute(); return <GuestDetailScreen celebrationId={celebrationId} onNavigate={onNavigate} guestId={params['id']} />; }
