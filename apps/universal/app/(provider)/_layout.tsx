import { Stack } from 'expo-router';
import { errorBoundaryFor } from '../../src/platform/error-boundary';
import { RouteGuard } from '../../src/auth/route-guard';

/** M11: an error inside (provider) keeps the rest of the app alive and offers a retry of this area. */
export const ErrorBoundary = errorBoundaryFor('provider');

/** F05-03: only roles allowed in the (provider) group get past this point. */
export default function ProviderLayout() { return <RouteGuard group="provider"><Stack screenOptions={{ headerShown: false }} /></RouteGuard>; }
