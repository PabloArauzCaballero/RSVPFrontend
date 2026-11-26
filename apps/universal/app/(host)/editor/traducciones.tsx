import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const TranslationEditorScreen = lazyScreen(loadHostScreens, (zone) => zone.TranslationEditorScreen);

/** C13 · Traducciones. */
export default function TranslationsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <TranslationEditorScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
