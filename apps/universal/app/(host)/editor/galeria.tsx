import { GalleryEditorScreen } from '../../../src/host/gallery-editor';
import { useHostRoute } from '../../../src/platform/route';

/** C12 · Galería. */
export default function GalleryRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GalleryEditorScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
