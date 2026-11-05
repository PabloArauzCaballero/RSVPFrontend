import { GroupsScreen } from '../../../src/host/guests/groups-screen';
import { useHostRoute } from '../../../src/platform/route';

/** C22 · Grupos familiares. */
export default function GroupsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GroupsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
