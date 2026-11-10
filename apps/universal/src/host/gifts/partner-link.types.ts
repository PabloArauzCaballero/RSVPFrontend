import type { Destination } from "@rsvp/query-hooks";

export interface GiftPartnerLinkProps {
  readonly listingId: string;
  readonly destination: Destination;
  readonly celebrationId: string;
  readonly label: string;
}
