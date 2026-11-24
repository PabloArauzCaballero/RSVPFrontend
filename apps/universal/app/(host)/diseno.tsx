import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const DesignEditorScreen = lazyScreen(loadHostScreens, (zone) => zone.DesignEditorScreen);

/** Plantillas F5 · invitation editor (web). `?c=` carries the celebration. */
export default function DesignEditorRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <DesignEditorScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
