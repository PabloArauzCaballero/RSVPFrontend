import type { Translate } from "../types.js";
import type { LocationLabels } from "./location-view.js";

/** The words of a place on the invitation (`celebration.venues.*`), translated on the server and handed to the client component. */
export function locationLabels(t: Translate, name: string): LocationLabels {
  return {
    showMap: t("celebration.venues.showMap"), hideMap: t("celebration.venues.hideMap"), directions: t("celebration.venues.howToGetThere"),
    copy: t("celebration.venues.copyAddress"), copied: t("celebration.venues.copied"), copyFailed: t("celebration.venues.copyFailed"),
    mapLabel: t("celebration.venues.mapLabel", { name }), privacy: t("celebration.venues.mapPrivacy"), loading: t("celebration.venues.mapLoading"),
    unavailable: t("celebration.venues.mapUnavailable"), openInOsm: t("celebration.venues.openInOsm"), unverified: t("celebration.venues.unverified")
  };
}
