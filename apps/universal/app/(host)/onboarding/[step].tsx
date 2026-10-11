import { useLocalSearchParams } from 'expo-router';
import { Onboarding } from '../../../src/host-workflows';
export default function OnboardingScreen() { const { step } = useLocalSearchParams<{ step?: string }>(); const parsed = Number(step); return <Onboarding step={parsed === 2 || parsed === 3 ? parsed : 1} />; }
