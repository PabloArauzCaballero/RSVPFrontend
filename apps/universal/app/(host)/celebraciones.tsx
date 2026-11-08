import { CelebrationsScreen } from '../../src/host/celebrations';
import { useHostRoute } from '../../src/platform/route';

/** C2 · Mis celebraciones. */
export default function CelebrationsRoute() { const { onNavigate, params } = useHostRoute(); return <CelebrationsScreen onNavigate={onNavigate} openOnly={params['entrar'] === '1'} />; }
