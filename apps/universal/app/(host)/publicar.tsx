import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const PublishScreen = lazyScreen(loadHostScreens, (zone) => zone.PublishScreen);

/** C16 · Publicar. */
export default function PublishRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <PublishScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
