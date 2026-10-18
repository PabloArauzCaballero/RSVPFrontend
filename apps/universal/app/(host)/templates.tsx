import { TemplatesScreen } from '../../src/host/templates-screen';
import { useHostRoute } from '../../src/platform/route';

/** C14 · Templates compatibles. */
export default function TemplatesRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <TemplatesScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
