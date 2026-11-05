import { GiftInboxScreen } from '../../../src/host/gifts/inbox-screen';
import { useHostRoute } from '../../../src/platform/route';

/** C25 · Bandeja de reservas pendientes de regalos. */
export default function GiftInboxRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GiftInboxScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
