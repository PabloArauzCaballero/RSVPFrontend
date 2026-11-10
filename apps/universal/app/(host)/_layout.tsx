import { Stack, useGlobalSearchParams, useLocalSearchParams, useSegments } from 'expo-router';
import { RouteGuard } from '../../src/auth/route-guard';
import { giftRequestPath, validGiftTarget } from '../../src/push/actions';

/** F05-03: only roles allowed in the (host) group get past this point. */
export default function HostLayout() {
  const segments = useSegments();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { c } = useGlobalSearchParams<{ c?: string }>();
  const target = { celebrationId: c ?? '', reservationId: id ?? '' };
  const isGiftRequest = segments.join('/') === '(host)/bandeja/[id]';
  const returnTo = isGiftRequest && validGiftTarget(target) ? giftRequestPath(target) : undefined;
  return <RouteGuard group="host" returnTo={returnTo}><Stack screenOptions={{ headerShown: false }} /></RouteGuard>;
}
