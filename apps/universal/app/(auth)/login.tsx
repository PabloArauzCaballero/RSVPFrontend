import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { RedirectIfSignedIn } from '../../src/auth/route-guard';
import { LoginScreen } from '../../src/auth/screens';

/** F05 · Sign in. `?returnTo=` brings the person back to the page that asked for a session. */
export default function LoginRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const router = useRouter();
  const back = typeof returnTo === 'string' ? returnTo : null;
  return <RedirectIfSignedIn returnTo={back}><LoginScreen returnTo={back} onNavigate={(href) => router.push(href as Href)} /></RedirectIfSignedIn>;
}
