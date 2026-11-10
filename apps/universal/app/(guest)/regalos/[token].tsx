import { useCallback } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { GuestLinkLanding } from "../../../src/guest/link-landing";

/** Local token-only alias; public invitations keep the canonical RSVP URL with its web fallback. */
export default function GuestGiftLinkRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const onResolved = useCallback((path: string) => router.replace(path as Href), [router]);
  return <GuestLinkLanding token={typeof token === "string" ? token : ""} surface="gifts" onResolved={onResolved} />;
}
