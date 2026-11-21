import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GalleryEditorScreen = lazyScreen(loadHostScreens, (zone) => zone.GalleryEditorScreen);

/** C12 · Galería. */
export default function GalleryRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GalleryEditorScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
