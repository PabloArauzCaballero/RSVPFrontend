import { Redirect, type Href } from 'expo-router';
import { Checking } from '../src/auth/route-guard';
import { useAuth } from '../src/auth/auth-context';
import { AUTH_ROUTES, homeFor } from '../src/auth/routes';

/** Entry: signed-in people land in their space, everyone else at sign-in. */
export default function Index() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Checking />;
  const home = state.session ? homeFor(state.session.roles) : null;
  return <Redirect href={(home ?? AUTH_ROUTES.login) as Href} />;
}
