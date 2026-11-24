import { Stack } from 'expo-router';
import { errorBoundaryFor } from '../../src/platform/error-boundary';
import { RouteGuard } from '../../src/auth/route-guard';

/** M11: an error inside (account) keeps the rest of the app alive and offers a retry of this area. */
export const ErrorBoundary = errorBoundaryFor('account');

/** DPA-10: any signed-in account gets past this point, whatever its roles; an anonymous visitor goes to sign-in and comes back. */
export default function AccountLayout() { return <RouteGuard group="account"><Stack screenOptions={{ headerShown: false }} /></RouteGuard>; }
