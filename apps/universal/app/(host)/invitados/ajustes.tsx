import { GuestSettingsScreen } from '../../../src/host/guests/settings-screen';
import { useHostRoute } from '../../../src/platform/route';

/** Ajustes de invitados: acompañantes por defecto y retención de datos. */
export default function GuestSettingsRoute() { const { celebrationId, onNavigate } = useHostRoute(); return <GuestSettingsScreen celebrationId={celebrationId} onNavigate={onNavigate} />; }
