import { Redirect, type Href } from 'expo-router';
import { Checking } from '../src/auth/route-guard';
import { useAuth } from '../src/auth/auth-context';
import { AUTH_ROUTES, HOME_BY_GROUP, homeFor } from '../src/auth/routes';

/** Entry: signed-in people land in their space, everyone else at sign-in. */
export default function Index() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Checking />;
  const home = state.session ? homeFor(state.session.roles) : null;
  // A host enters through the list with `?entrar=1`: with a single celebration it opens straight on Inicio.
  const target = home === HOME_BY_GROUP.host ? `${home}?entrar=1` : home;
  return <Redirect href={(target ?? AUTH_ROUTES.login) as Href} />;
}
