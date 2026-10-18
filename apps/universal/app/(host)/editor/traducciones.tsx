import { TranslationEditorScreen } from '../../../src/host/translation-editor';
import { useHostRoute } from '../../../src/platform/route';

/** C13 · Traducciones. */
export default function TranslationsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <TranslationEditorScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
