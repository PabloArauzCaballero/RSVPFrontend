import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const CatalogScreen = lazyScreen(loadHostScreens, (zone) => zone.CatalogScreen);

export default function Route() { const { celebrationId, onNavigate } = useHostRoute(); return <CatalogScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
