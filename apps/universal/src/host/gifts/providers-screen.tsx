import type { ReactNode } from "react";
import type { ScreenProps } from "../gate";
import { AddGiftScreen } from "./add-screen";

/**
 * /regalos/proveedores: kept so old links still land somewhere useful. «De un proveedor» is no longer a gift origin
 * (A28: it let the host add services), so the route opens the add-a-gift flow on the product catalog.
 */
export function ProvidersScreen(props: ScreenProps): ReactNode {
  return <AddGiftScreen {...props} initial="catalog" />;
}
