import type { ReactNode } from "react";
import type { ScreenProps } from "../gate";
import { AddGiftScreen } from "./add-screen";

/** /regalos/externo: the add-a-gift flow opened on its «De una tienda» origin (REQ-F23-03). The panel lives in `store-panel.tsx`. */
export function ExternalScreen(props: ScreenProps): ReactNode {
  return <AddGiftScreen {...props} initial="store" />;
}
