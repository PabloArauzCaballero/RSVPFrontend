import { ImportGuestsScreen } from '../../../src/host/guests/import-screen';
import { useHostRoute } from '../../../src/platform/route';

/** C21 · Importación CSV. */
export default function ImportRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <ImportGuestsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
