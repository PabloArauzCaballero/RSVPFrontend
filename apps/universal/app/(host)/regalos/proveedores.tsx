import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const ProvidersScreen = lazyScreen(loadHostScreens, (zone) => zone.ProvidersScreen);

export default function Route() { const { celebrationId, onNavigate } = useHostRoute(); return <ProvidersScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
