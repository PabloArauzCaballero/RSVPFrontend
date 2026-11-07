import type { ReactNode } from "react";
import type { ScreenProps } from "../gate";
import { AddGiftScreen } from "./add-screen";

/** /regalos/proveedores: the add-a-gift flow opened on its «De un proveedor» origin (REQ-F23-05). The panel lives in `providers-panel.tsx`. */
export function ProvidersScreen(props: ScreenProps): ReactNode {
  return <AddGiftScreen {...props} initial="provider" />;
}
