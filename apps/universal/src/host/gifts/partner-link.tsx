import { useState, type ReactNode } from "react";
import { Linking } from "react-native";
import { partnerRedirectUrl } from "../../platform/partner-link";
import { useT } from "../../platform/providers";
import { ActionButton, Notice } from "../ui";
import type { GiftPartnerLinkProps } from "./partner-link.types";

export function GiftPartnerLink({ listingId, destination, celebrationId, label }: GiftPartnerLinkProps): ReactNode {
  const t = useT();
  const [failed, setFailed] = useState(false);
  let url: string;
  try { url = partnerRedirectUrl(listingId, { destination, celebrationId, surface: "APP" }); } catch { return <Notice kind="error">{t("hostGifts.partnerOpenFailed")}</Notice>; }
  return <><ActionButton variant="secondary" label={label} testID={`dest-${listingId}-${destination}`} onPress={() => { setFailed(false); void Linking.openURL(url).catch(() => setFailed(true)); }} />
    {failed ? <Notice kind="error">{t("hostGifts.partnerOpenFailed")}</Notice> : null}</>;
}
