import { PartnerRequestScreen } from '../../../src/account/partner-request-screen';
import { useHostRoute } from '../../../src/platform/route';

/** DPA-10 · Solicitud para ser partner (any signed-in account; the address is PARTNER_REQUEST_ROUTE). */
export default function PartnerRequestRoute() { const { onNavigate } = useHostRoute(); return <PartnerRequestScreen onNavigate={onNavigate} />; }
