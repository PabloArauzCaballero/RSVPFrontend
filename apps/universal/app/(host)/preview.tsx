import { DevicePreviewScreen } from '../../src/host/device-preview';
import { useHostRoute } from '../../src/platform/route';

/** C15 · Vista previa por dispositivo. */
export default function PreviewRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <DevicePreviewScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
