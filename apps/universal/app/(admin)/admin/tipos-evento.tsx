import { EventTypesScreen } from '../../../src/admin/event-types';
import { useHostRoute } from '../../../src/platform/route';

/** E4 · Tipos de evento. */
export default function AdminEventTypesRoute() { const { onNavigate } = useHostRoute(); return <EventTypesScreen onNavigate={onNavigate} />; }
