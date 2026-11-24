import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const ImportGuestsScreen = lazyScreen(loadHostScreens, (zone) => zone.ImportGuestsScreen);

/** C21 · Importación CSV. */
export default function ImportRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <ImportGuestsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
