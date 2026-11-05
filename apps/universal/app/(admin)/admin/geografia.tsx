import { GeographyScreen } from '../../../src/admin/catalog';
import { useHostRoute } from '../../../src/platform/route';

/** E6 · Geografía. */
export default function Route() { const { onNavigate } = useHostRoute(); return <GeographyScreen onNavigate={onNavigate} />; }
