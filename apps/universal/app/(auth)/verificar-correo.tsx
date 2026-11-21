import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { VerifyEmailScreen } from '../../src/auth/screens';

/** B4 · E-mail verification link (`/verificar-correo?token=…`). Works signed in or not. */
export default function VerifyEmailRoute() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <VerifyEmailScreen token={typeof token === 'string' && token ? token : null} onNavigate={(href) => router.replace(href as Href)} />;
}
