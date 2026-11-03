import { Stack } from 'expo-router';
import { RouteGuard } from '../../src/auth/route-guard';

/** F05-03: only roles allowed in the (admin) group get past this point. */
export default function AdminLayout() { return <RouteGuard group="admin"><Stack screenOptions={{ headerShown: false }} /></RouteGuard>; }
