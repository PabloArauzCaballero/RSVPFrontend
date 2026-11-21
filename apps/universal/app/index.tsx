import { Redirect, type Href } from 'expo-router';
import { Checking } from '../src/auth/route-guard';
import { useAuth } from '../src/auth/auth-context';
import { homeFor } from '../src/auth/routes';
import { AnonymousHome } from '../src/landing/anonymous-home';

/**
 * Entry: signed-in people land in their space on every platform. Without a session the web shows the public home and
 * iOS/Android open at sign-in (`anonymous-home.web.tsx` / `anonymous-home.tsx`, picked by the bundler per platform).
 */
export default function Index() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Checking />;
  const home = state.session ? homeFor(state.session.roles) : null;
  return home ? <Redirect href={home as Href} /> : <AnonymousHome />;
}
