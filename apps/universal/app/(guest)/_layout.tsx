import { Stack } from "expo-router";

/** Guest routes are public: the invitation credential is checked by the API, never by a host login gate. */
export default function GuestLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "none" }} />;
}
