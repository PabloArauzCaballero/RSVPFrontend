import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GroupsScreen = lazyScreen(loadHostScreens, (zone) => zone.GroupsScreen);

/** C22 · Grupos familiares. */
export default function GroupsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GroupsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
