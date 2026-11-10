import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { RedirectIfSignedIn } from '../../src/auth/route-guard';
import { RegisterScreen } from '../../src/auth/screens';

/** F05 · Create an account (HOST, PLANNER or PROVIDER; ADMIN is never self-service). */
export default function RegisterRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const router = useRouter();
  const back = typeof returnTo === 'string' ? returnTo : null;
  return <RedirectIfSignedIn returnTo={back}><RegisterScreen returnTo={back} onNavigate={(href) => router.push(href as Href)} /></RedirectIfSignedIn>;
}
