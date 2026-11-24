import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GuestListScreen = lazyScreen(loadHostScreens, (zone) => zone.GuestListScreen);

/** C19 · Lista de invitados. */
export default function GuestsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GuestListScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
