import { GiftsScreen } from '../../../src/host/gifts/gifts-screen';
import { useHostRoute } from '../../../src/platform/route';

export default function Route() { const { celebrationId, onNavigate } = useHostRoute(); return <GiftsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
