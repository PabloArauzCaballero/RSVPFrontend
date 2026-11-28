import type { ReactNode } from "react";
import { formatCoordinates, osmDirectionsUrl, osmSearchUrl } from "@rsvp/location";
import type { ShownVenue } from "../content.js";
import type { Translate } from "../types.js";
import { VenueTools, type VenueToolsLabels } from "./venue-tools.js";

const MAP_PROVIDER = "OpenStreetMap";

/**
 * What a guest gets for one place: its name and address in words (always enough on their own), and the tools. With a point:
 * the map with its pin, «how to get there» (OpenStreetMap directions) and «copy address». Without one (an old invitation
 * whose link carries no point, or only text): no map and no point is made up; «how to get there» opens OpenStreetMap's
 * search for the written address, or for the name when there is none, and says it is a search. With nothing to search for
 * there is no link. A saved link is never shown or followed. Runs on the server: the client part receives plain text,
 * already translated.
 */
export function VenueDetails({ venue, t }: { readonly venue: ShownVenue; readonly t: Translate }): ReactNode {
  const { name: title, location } = venue;
  const address = venue.address ?? location?.address;
  const reference = location?.reference;
  // With no written address, the coordinates are what lets whoever receives the text find the place.
  const copyText = [title, address, reference, !address && location ? formatCoordinates(location) : undefined].filter(Boolean).join(", ");
  // One text only: the search wants every word to match, so a venue name beside an address would empty most results.
  const searchHref = location ? undefined : (address ? osmSearchUrl(address) : null) ?? osmSearchUrl(title) ?? undefined;
  const directionsHref = location ? osmDirectionsUrl(location) : searchHref;
  const labels: VenueToolsLabels = {
    openMap: t("celebration.media.openMap"), showMap: t("celebration.media.showMap", { title }), privacy: t("celebration.media.privacy", { provider: MAP_PROVIDER }),
    loading: t("celebration.media.loading", { provider: MAP_PROVIDER }), failed: t("celebration.media.loadFailed", { provider: MAP_PROVIDER }),
    retryShort: t("celebration.media.retryShort"), retry: t("celebration.media.retry", { title }), mapLabel: t("celebration.venues.mapLabel", { title }),
    directions: t("celebration.venues.howToGetThere"), directionsName: t(searchHref ? "celebration.venues.searchName" : "celebration.venues.directionsName", { title }),
    copy: t("celebration.venues.copy"), copyName: t("celebration.venues.copyName", { title }), copied: t("celebration.venues.copied"),
    copyFailed: t("celebration.venues.copyFailed"), unmarked: t(searchHref ? "celebration.venues.searchOnly" : "celebration.venues.unmarked")
  };
  return (
    <>
      <strong>{title}</strong>
      {address ? <p>{address}</p> : null}
      {reference ? <p>{reference}</p> : null}
      <VenueTools labels={labels} copyText={copyText} {...(location ? { point: { lat: location.lat, lng: location.lng } } : {})} {...(directionsHref ? { directionsHref } : {})} />
    </>
  );
}
