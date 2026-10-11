import { useLocalSearchParams } from 'expo-router';
import { ContentEditor } from '../../../src/host-workflows';
const sections = ['inicio', 'lugares', 'historia', 'itinerario', 'secciones'] as const;
export default function ContentEditorScreen() { const { section } = useLocalSearchParams<{ section?: string }>(); const value = sections.find((item) => item === section) ?? 'inicio'; return <ContentEditor section={value} />; }
