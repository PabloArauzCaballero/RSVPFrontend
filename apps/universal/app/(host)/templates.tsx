import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const TemplatesScreen = lazyScreen(loadHostScreens, (zone) => zone.TemplatesScreen);

/** C14 · Templates compatibles. */
export default function TemplatesRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <TemplatesScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
