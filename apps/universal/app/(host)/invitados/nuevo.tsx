import { GuestFormScreen } from '../../../src/host/guests/guest-form-screen';
import { useHostRoute } from '../../../src/platform/route';

/** C20 · Alta individual. */
export default function NewGuestRoute() { const { celebrationId, onNavigate, params } = useHostRoute(); return <GuestFormScreen celebrationId={celebrationId} onNavigate={onNavigate} groupId={params['g']} />; }
