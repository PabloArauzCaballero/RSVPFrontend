import { OrganizationsScreen } from '../../src/auth/organizations-screen';
import { useHostRoute } from '../../src/platform/route';

/** Organizaciones: crear una y agregar miembros (POST /organizations, /organizations/{id}/members). */
export default function OrganizationsRoute() { const { onNavigate } = useHostRoute(); return <OrganizationsScreen onNavigate={onNavigate} />; }
