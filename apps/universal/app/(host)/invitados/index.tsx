import { GuestListScreen } from '../../../src/host/guests/guest-list-screen';
import { useHostRoute } from '../../../src/platform/route';

/** C19 · Lista de invitados. */
export default function GuestsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GuestListScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
