import { Stack } from 'expo-router';
import { errorBoundaryFor } from '../../src/platform/error-boundary';

/** M11: an error inside (guest) keeps the rest of the app alive and offers a retry of this area. */
export const ErrorBoundary = errorBoundaryFor('guest');

export default function GuestLayout() { return <Stack screenOptions={{ headerShown: false }} />; }
