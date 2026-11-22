import { Stack } from 'expo-router';
import { RouteGuard } from '../../src/auth/route-guard';

/** DPA-10: any signed-in account gets past this point, whatever its roles; an anonymous visitor goes to sign-in and comes back. */
export default function AccountLayout() { return <RouteGuard group="account"><Stack screenOptions={{ headerShown: false }} /></RouteGuard>; }
