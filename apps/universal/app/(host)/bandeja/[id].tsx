import { GiftRequestScreen } from "../../../src/push/request-screen";
import { useHostRoute } from "../../../src/platform/route";

export default function GiftRequestRoute() {
  const { celebrationId, onNavigate, params } = useHostRoute();
  return <GiftRequestScreen celebrationId={celebrationId} reservationId={params["id"]} onNavigate={onNavigate} />;
}
