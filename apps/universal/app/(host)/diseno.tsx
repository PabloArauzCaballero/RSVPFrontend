import { errorBoundaryFor } from '../../src/platform/error-boundary';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const DesignEditorScreen = lazyScreen(
  () => import('../../src/host/design-editor-screen'),
  (editor) => editor.DesignEditorScreen,
);

export const ErrorBoundary = errorBoundaryFor('design-editor');

/** Plantillas F5 · invitation editor (web). `?c=` carries the celebration. */
export default function DesignEditorRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <DesignEditorScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
