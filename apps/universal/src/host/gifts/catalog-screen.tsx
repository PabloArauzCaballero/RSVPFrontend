import type { ReactNode } from "react";
import type { ScreenProps } from "../gate";
import { AddGiftScreen } from "./add-screen";

/** /regalos/catalogo: the add-a-gift flow opened on its «Del catálogo» origin (REQ-F23-02). The panel lives in `catalog-panel.tsx`. */
export function CatalogScreen(props: ScreenProps): ReactNode {
  return <AddGiftScreen {...props} initial="catalog" />;
}
