import { ExternalScreen } from '../../../src/host/gifts/external-screen';
import { useHostRoute } from '../../../src/platform/route';

export default function Route() { const { celebrationId, onNavigate } = useHostRoute(); return <ExternalScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
