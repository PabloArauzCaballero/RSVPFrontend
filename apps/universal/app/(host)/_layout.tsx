import { Stack } from 'expo-router';
import { RouteGuard } from '../../src/auth/route-guard';

/** F05-03: only roles allowed in the (host) group get past this point. */
export default function HostLayout() { return <RouteGuard group="host"><Stack screenOptions={{ headerShown: false }} /></RouteGuard>; }
