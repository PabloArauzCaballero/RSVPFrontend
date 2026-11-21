import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ResetPasswordScreen } from '../../src/auth/screens';

/** B4 · New password from the recovery e-mail link (`/restablecer?token=…`). */
export default function ResetPasswordRoute() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <ResetPasswordScreen token={typeof token === 'string' && token ? token : null} onNavigate={(href) => router.replace(href as Href)} />;
}
