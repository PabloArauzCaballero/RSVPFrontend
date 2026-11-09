import { CelebrationsScreen } from '../../src/host/celebrations';
import { useHostRoute } from '../../src/platform/route';

/** C2 · Mis celebraciones. */
export default function CelebrationsRoute() { const { onNavigate } = useHostRoute(); return <CelebrationsScreen onNavigate={onNavigate} />; }
