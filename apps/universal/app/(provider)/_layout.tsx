import { Stack } from 'expo-router';
import { RouteGuard } from '../../src/auth/route-guard';

/** F05-03: only roles allowed in the (provider) group get past this point. */
export default function ProviderLayout() { return <RouteGuard group="provider"><Stack screenOptions={{ headerShown: false }} /></RouteGuard>; }
