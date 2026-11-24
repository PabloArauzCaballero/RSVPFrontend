import { loadAdminScreens } from '../../../src/admin/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';
import { useHostRoute } from '../../../src/platform/route';

const VerificationScreen = lazyScreen(loadAdminScreens, (zone) => zone.VerificationScreen);

/** E7 · Verificación de proveedores. */
export default function AdminVerificationRoute() { const { onNavigate } = useHostRoute(); return <VerificationScreen onNavigate={onNavigate} />; }
