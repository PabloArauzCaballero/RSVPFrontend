import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GuestFormScreen = lazyScreen(loadHostScreens, (zone) => zone.GuestFormScreen);

/** C20 · Alta individual. */
export default function NewGuestRoute() { const { celebrationId, onNavigate, params } = useHostRoute(); return <GuestFormScreen celebrationId={celebrationId} onNavigate={onNavigate} groupId={params['g']} />; }
