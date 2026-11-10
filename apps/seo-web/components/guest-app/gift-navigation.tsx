"use client";

interface Props { readonly slug: string; readonly token: string; readonly label: string }

/** The fragment is consumed by the existing gift page; it never becomes an API query or a Referer. */
export function guestWebGiftPath(slug: string, token: string): string {
  return `/c/${encodeURIComponent(slug)}/regalos#t=${encodeURIComponent(token)}`;
}

export function GuestGiftNavigation({ slug, token, label }: Props) {
  return <div className="rsvp-actions"><button type="button" className="rsvp-button rsvp-button--secondary" data-testid="guest-web-gifts" onClick={() => window.location.assign(guestWebGiftPath(slug, token))}>{label}</button></div>;
}
