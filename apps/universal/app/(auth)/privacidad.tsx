import { useRouter, type Href } from 'expo-router';
import { LegalScreen } from '../../src/legal/legal-screen';

/** B6 · privacy inside the app, reachable without a session (linked from sign-up and the RSVP form). */
export default function LegalRoute() { const router = useRouter(); return <LegalScreen document="privacy" onNavigate={(href) => router.push(href as Href)} />; }
