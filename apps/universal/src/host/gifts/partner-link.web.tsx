import type { ReactNode } from "react";
import { colors, radius, spacing, typography } from "@rsvp/design-tokens";
import { partnerRedirectUrl } from "../../platform/partner-link";
import { useT } from "../../platform/providers";
import { Notice, styles } from "../ui";
import type { GiftPartnerLinkProps } from "./partner-link.types";

export function GiftPartnerLink({ listingId, destination, celebrationId, label }: GiftPartnerLinkProps): ReactNode {
  const t = useT();
  let url: string;
  try { url = partnerRedirectUrl(listingId, { destination, celebrationId, surface: "APP" }); } catch { return <Notice kind="error">{t("hostGifts.partnerOpenFailed")}</Notice>; }
  return <a href={url} target="_blank" rel="sponsored noopener noreferrer" data-testid={`dest-${listingId}-${destination}`}
    style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", minHeight: 48, padding: `${spacing[2]}px ${spacing[4]}px`, borderRadius: radius.md, background: colors.light.primaryMuted, color: colors.light.primary, fontSize: typography.fontSize.base, fontWeight: 700, fontFamily: styles.body.fontFamily, textDecoration: "none", maxWidth: "100%", overflowWrap: "anywhere" }}>{label}</a>;
}
