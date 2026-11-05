import type { DeepStrings } from "../types.js";
import type { searchEsBO } from "../es-BO/search.js";

/** Provider search by proximity (F24 REQ-04). */
export const searchEnUS: DeepStrings<typeof searchEsBO> = {
  radius: "Radius near me",
  radiusOption: "{{km}} km",
  nearMe: {
    use: "Use my location",
    locating: "Finding your location…",
    denied: "We could not get your location. Pick a city to continue.",
    active: "Showing providers within {{km}} km of you.",
    clear: "Clear location"
  }
};
