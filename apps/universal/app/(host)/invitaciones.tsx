import { InvitationsScreen } from '../../src/auth/invitations-screen';
import { useHostRoute } from '../../src/platform/route';

/** Invitaciones a organizaciones: aceptar o rechazar (GET /invitations, POST /invitations/{id}/accept|decline). El correo abre ?invitacion=&token=. */
export default function InvitationsRoute() {
  const { onNavigate, params } = useHostRoute();
  return <InvitationsScreen onNavigate={onNavigate} {...(params['invitacion'] ? { invitationId: params['invitacion'] } : {})} {...(params['token'] ? { token: params['token'] } : {})} />;
}
