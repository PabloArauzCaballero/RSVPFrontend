import { useLocalSearchParams } from 'expo-router';
import { CelebrationsScreen } from '../../src/host/celebrations';
import { useHostRoute } from '../../src/platform/route';

/** C2 · Mis celebraciones. `?lista=1` shows the list even when there is only one celebration (a link that means "the list", not "my event"). */
export default function CelebrationsRoute() {
  const { onNavigate } = useHostRoute();
  const { lista } = useLocalSearchParams<{ lista?: string }>();
  return <CelebrationsScreen onNavigate={onNavigate} autoOpen={lista !== '1'} />;
}
