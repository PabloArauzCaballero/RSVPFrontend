import { useRouter } from 'expo-router';
import { PartnersScreen } from '../../../src/admin/partners/partners-screen';
import { useHostRoute } from '../../../src/platform/route';

/** A24 · Partners: table, filters in the URL query and the «Crear partner» dialog. */
export default function Route() {
  const { onNavigate, params } = useHostRoute();
  const router = useRouter();
  return <PartnersScreen onNavigate={onNavigate} params={params} onParams={(next) => router.setParams(next)} />;
}
