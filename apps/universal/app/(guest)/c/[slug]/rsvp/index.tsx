import { useLocalSearchParams } from "expo-router";
import { GuestRsvpScreen } from "../../../../../src/guest/rsvp-screen";

/** A13 · RSVP of a person without a personal link. */
export default function GuestPublicRsvpRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <GuestRsvpScreen slug={typeof slug === "string" ? slug : ""} />;
}
