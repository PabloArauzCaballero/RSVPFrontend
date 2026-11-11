import type { ReactNode } from "react";
import type { MapPickerProps } from "./map-picker";

/** iOS and Android: there is no map to mark yet; the host pastes the link their maps app shares. */
export const MAP_PICKER_AVAILABLE = false;

export function MapPicker(_props: MapPickerProps): ReactNode {
  return null;
}
