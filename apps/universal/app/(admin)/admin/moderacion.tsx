import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const ModerationScreen = lazyScreen(loadAdminScreens, (zone) => zone.ModerationScreen);

/** E8 · Moderación. */
export default function Route() { const { onNavigate } = useHostRoute(); return <ModerationScreen onNavigate={onNavigate} />; }
