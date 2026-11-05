import { useLocalSearchParams } from "expo-router";
import { GuestRsvpScreen } from "../../../../../src/guest/rsvp-screen";

/** F21-04 · personal link https://<domain>/c/{slug}/rsvp/{token} (or rsvp://c/{slug}/rsvp/{token}) inside the app. */
export default function GuestRsvpRoute() {
  const { slug, token } = useLocalSearchParams<{ slug?: string; token?: string }>();
  return <GuestRsvpScreen slug={typeof slug === "string" ? slug : ""} token={typeof token === "string" ? token : undefined} />;
}
