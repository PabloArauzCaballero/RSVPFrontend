import { CatalogScreen } from '../../../src/host/gifts/catalog-screen';
import { useHostRoute } from '../../../src/platform/route';
import { useLocalSearchParams } from 'expo-router';

export default function Route() {
  const { celebrationId, onNavigate } = useHostRoute();
  const { q } = useLocalSearchParams<{ q?: string | string[] }>();
  return <CatalogScreen celebrationId={celebrationId} onNavigate={onNavigate} initialQuery={Array.isArray(q) ? q[0] : q} />;
}
