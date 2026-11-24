import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const InvitationsScreen = lazyScreen(loadHostScreens, (zone) => zone.InvitationsScreen);

/** Invitaciones a organizaciones: aceptar o rechazar (GET /invitations, POST /invitations/{id}/accept|decline). El correo abre ?invitacion=&token=. */
export default function InvitationsRoute() {
  const { onNavigate, params } = useHostRoute();
  return <InvitationsScreen onNavigate={onNavigate} {...(params['invitacion'] ? { invitationId: params['invitacion'] } : {})} {...(params['token'] ? { token: params['token'] } : {})} />;
}
