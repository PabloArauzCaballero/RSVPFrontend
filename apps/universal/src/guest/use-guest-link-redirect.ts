import { useEffect } from "react";
import { router, useNavigationContainerRef, type Href } from "expo-router";
import { saveGiftCredential } from "./gift-credential";

/** Keep the credential in the session and replace the incoming URL once Expo can navigate. */
export function useGuestLinkRedirect(slug: string, credential: string | null, screen: "rsvp" | "regalos" | null): void {
  const navigation = useNavigationContainerRef();

  useEffect(() => {
    if (!slug || !screen) return;
    const replace = (): void => {
      if (credential) saveGiftCredential(slug, credential);
      router.replace(`/c/${encodeURIComponent(slug)}/${screen}` as Href);
    };

    if (!navigation.isReady()) return navigation.addListener("ready", replace);
    replace();
  }, [navigation, slug, credential, screen]);
}
