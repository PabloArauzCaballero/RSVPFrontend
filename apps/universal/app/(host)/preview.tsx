import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const DevicePreviewScreen = lazyScreen(loadHostScreens, (zone) => zone.DevicePreviewScreen);

/** C15 · Vista previa por dispositivo. */
export default function PreviewRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <DevicePreviewScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
