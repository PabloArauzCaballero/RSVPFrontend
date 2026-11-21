import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GiftsScreen = lazyScreen(loadHostScreens, (zone) => zone.GiftsScreen);

export default function Route() { const { celebrationId, onNavigate } = useHostRoute(); return <GiftsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
