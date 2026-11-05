import { ProvidersScreen } from '../../../src/host/gifts/providers-screen';
import { useHostRoute } from '../../../src/platform/route';

export default function Route() { const { celebrationId, onNavigate } = useHostRoute(); return <ProvidersScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
