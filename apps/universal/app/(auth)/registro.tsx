import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { RedirectIfSignedIn } from '../../src/auth/route-guard';
import { RegisterScreen } from '../../src/auth/screens';

/** F05 · Create an account (HOST, PLANNER, and PROVIDER only while EXPO_PUBLIC_PROVIDER_SELF_SERVICE is on; ADMIN is never self-service). */
export default function RegisterRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const router = useRouter();
  const back = typeof returnTo === 'string' ? returnTo : null;
  return <RedirectIfSignedIn returnTo={back} newAccount><RegisterScreen returnTo={back} onNavigate={(href) => router.push(href as Href)} /></RedirectIfSignedIn>;
}
