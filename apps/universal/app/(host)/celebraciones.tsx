import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useLocalSearchParams } from 'expo-router';
import { useHostRoute } from '../../src/platform/route';

const CelebrationsScreen = lazyScreen(loadHostScreens, (zone) => zone.CelebrationsScreen);

/** C2 · Mis celebraciones. `?lista=1` shows the list even when there is only one celebration (a link that means "the list", not "my event"). */
export default function CelebrationsRoute() {
  const { onNavigate } = useHostRoute();
  const { lista } = useLocalSearchParams<{ lista?: string }>();
  return <CelebrationsScreen onNavigate={onNavigate} autoOpen={lista !== '1'} />;
}
