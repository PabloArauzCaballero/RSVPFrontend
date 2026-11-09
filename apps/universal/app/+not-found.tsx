import { useRouter, type Href } from 'expo-router';
import { NotFoundScreen } from '../src/auth/not-found-screen';

/** Unmatched address: localized message and a way home (replaces expo-router's English "Unmatched Route"). */
export default function NotFound() { const router = useRouter(); return <NotFoundScreen onNavigate={(href) => router.replace(href as Href)} />; }
