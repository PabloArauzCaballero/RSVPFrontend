import { useLocalSearchParams } from "expo-router";
import { GuestGiftsScreen } from "../../../../../src/guest/gifts-screen";

/** F21-05 · gift list inside the app with the invitation-link credential: https://<domain>/c/{slug}/regalos/{token}. */
export default function GuestGiftsRoute() {
  const { slug, token } = useLocalSearchParams<{ slug?: string; token?: string }>();
  return <GuestGiftsScreen slug={typeof slug === "string" ? slug : ""} token={typeof token === "string" ? token : ""} />;
}
