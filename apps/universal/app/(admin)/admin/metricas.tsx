import { MetricsScreen } from '../../../src/admin/insight';
import { useHostRoute } from '../../../src/platform/route';

/** E11 · Métricas. */
export default function Route() { const { onNavigate } = useHostRoute(); return <MetricsScreen onNavigate={onNavigate} />; }
