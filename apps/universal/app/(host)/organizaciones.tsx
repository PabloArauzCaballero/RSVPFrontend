import { OrganizationsScreen } from '../../src/auth/organizations-screen';
import { useHostRoute } from '../../src/platform/route';

/** Organizaciones: crear una e invitar personas (POST /organizations, /organizations/{id}/invitations). */
export default function OrganizationsRoute() { const { onNavigate } = useHostRoute(); return <OrganizationsScreen onNavigate={onNavigate} />; }
