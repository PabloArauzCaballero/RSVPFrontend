import { PublishScreen } from '../../src/host/publish-checklist';
import { useHostRoute } from '../../src/platform/route';

/** C16 · Publicar. */
export default function PublishRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <PublishScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
