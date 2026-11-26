// The batcher is shared with the app (@rsvp/query-hooks) so both surfaces count an impression the same way.
export { createImpressionBatcher, recordImpressions } from "@rsvp/query-hooks";
