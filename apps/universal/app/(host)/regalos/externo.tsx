import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const ExternalScreen = lazyScreen(loadHostScreens, (zone) => zone.ExternalScreen);

export default function Route() { const { celebrationId, onNavigate } = useHostRoute(); return <ExternalScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
