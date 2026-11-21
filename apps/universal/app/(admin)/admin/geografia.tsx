import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GeographyScreen = lazyScreen(loadAdminScreens, (zone) => zone.GeographyScreen);

/** E6 · Geografía. */
export default function Route() { const { onNavigate } = useHostRoute(); return <GeographyScreen onNavigate={onNavigate} />; }
