import { InvitationLinkScreen } from '../../src/auth/invitation-link';

/** `/invitacion` without a personal link: says kindly that the link is needed and whom to ask for it. */
export default function GuestHome() { return <InvitationLinkScreen token={undefined} />; }
