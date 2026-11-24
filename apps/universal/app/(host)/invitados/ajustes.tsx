import { loadHostScreens } from '../../../src/host/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const GuestSettingsScreen = lazyScreen(loadHostScreens, (zone) => zone.GuestSettingsScreen);

/** Ajustes de invitados: acompañantes por defecto y retención de datos. */
export default function GuestSettingsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GuestSettingsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
