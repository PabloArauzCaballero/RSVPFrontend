import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GiftInboxScreen = lazyScreen(loadHostScreens, (zone) => zone.GiftInboxScreen);

/** C25 · Bandeja de reservas pendientes de regalos. */
export default function GiftInboxRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GiftInboxScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
