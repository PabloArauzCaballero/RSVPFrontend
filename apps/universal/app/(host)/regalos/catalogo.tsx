import { CatalogScreen } from '../../../src/host/gifts/catalog-screen';
import { useHostRoute } from '../../../src/platform/route';

export default function Route() { const { celebrationId, onNavigate } = useHostRoute(); return <CatalogScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
