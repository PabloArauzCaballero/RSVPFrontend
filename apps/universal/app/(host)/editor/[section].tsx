import { ContentEditorScreen } from '../../../src/host/content-editor';
import { EDITOR_SECTIONS, type EditorSection } from '../../../src/host/routes';
import { useHostRoute } from '../../../src/platform/route';

/** C7–C11 · Editor de contenido por sección. */
export default function ContentEditorRoute() {
  const { celebrationId, onNavigate, params } = useHostRoute();
  const section = EDITOR_SECTIONS.find((item): item is EditorSection => item === params['section']) ?? 'general';
  return <ContentEditorScreen section={section} celebrationId={celebrationId} onNavigate={onNavigate} />;
}
