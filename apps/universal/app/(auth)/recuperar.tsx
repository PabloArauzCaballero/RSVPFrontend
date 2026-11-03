import { useRouter, type Href } from 'expo-router';
import { RecoveryScreen } from '../../src/auth/screens';

/** F05 · Password recovery request. */
export default function RecoverRoute() {
  const router = useRouter();
  return <RecoveryScreen onNavigate={(href) => router.push(href as Href)} />;
}
