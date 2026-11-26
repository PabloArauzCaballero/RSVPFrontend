import { useRouter } from 'expo-router';
import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const PartnersScreen = lazyScreen(loadAdminScreens, (zone) => zone.PartnersScreen);

/** A24 · Partners: table, filters in the URL query and the «Crear partner» dialog. */
export default function Route() {
  const { onNavigate, params } = useHostRoute();
  const router = useRouter();
  return <PartnersScreen onNavigate={onNavigate} params={params} onParams={(next) => router.setParams(next)} />;
}
