import { Stack } from 'expo-router';
import { isDevBuild } from '../../src/platform/build-mode';
import NotFound from '../+not-found';

/**
 * L7: the design demos (/catalogo, /identidad, /movimiento) exist only in development builds. An exported web build or a
 * store build answers them with the same "page does not exist" screen as any unknown address.
 */
export default function DevLayout() { return isDevBuild() ? <Stack screenOptions={{ headerShown: false }} /> : <NotFound />; }
