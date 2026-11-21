import { Stack } from 'expo-router';
import { errorBoundaryFor } from '../../src/platform/error-boundary';
import { RouteGuard } from '../../src/auth/route-guard';

/** M11: an error inside (admin) keeps the rest of the app alive and offers a retry of this area. */
export const ErrorBoundary = errorBoundaryFor('admin');

/** F05-03: only roles allowed in the (admin) group get past this point. */
export default function AdminLayout() { return <RouteGuard group="admin"><Stack screenOptions={{ headerShown: false }} /></RouteGuard>; }
