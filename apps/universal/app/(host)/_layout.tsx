import { Stack } from 'expo-router';
import { errorBoundaryFor } from '../../src/platform/error-boundary';
import { RouteGuard } from '../../src/auth/route-guard';

/** M11: an error inside (host) keeps the rest of the app alive and offers a retry of this area. */
export const ErrorBoundary = errorBoundaryFor('host');

/** F05-03: only roles allowed in the (host) group get past this point. */
export default function HostLayout() { return <RouteGuard group="host"><Stack screenOptions={{ headerShown: false }} /></RouteGuard>; }
