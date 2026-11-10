import { useCallback } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { GuestLinkLanding } from "../../../src/guest/link-landing";

export default function InvitationLinkRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const onResolved = useCallback((path: string) => router.replace(path as Href), [router]);
  return <GuestLinkLanding token={typeof token === "string" ? token : ""} onResolved={onResolved} />;
}
