import { useLocalSearchParams } from 'expo-router';
import { InvitationLinkScreen } from '../../../src/auth/invitation-link';

/** F05-04: opened by the universal link https://<domain>/rsvp/<token> or by rsvp://rsvp/<token>. */
export default function InvitationLinkRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <InvitationLinkScreen token={typeof token === 'string' ? token : undefined} />;
}
