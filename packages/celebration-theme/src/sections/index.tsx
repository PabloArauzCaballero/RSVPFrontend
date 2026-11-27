import type { ReactNode } from "react";
import { GIFTS_CTA_KEYS, navigationHref, partnerHref, shownVenues, type CelebrationContent, type GalleryImage, type GiftsStatus } from "../content.js";
import { formatTime, zoneLabel } from "../format.js";
import { ActionIcon } from "../icon.js";
import type { SectionId, Translate } from "../types.js";
import { GalleryView } from "./gallery-view.js";

/** What every section receives. Sections never fetch and never hold copy of their own. */
export interface SectionProps {
  readonly content: CelebrationContent;
  readonly gallery: readonly GalleryImage[];
  readonly timeZone: string;
  readonly locale: string;
  readonly t: Translate;
  /** Where the RSVP call to action points when the visitor has their personal link: «Confirmar asistencia». */
  readonly rsvpHref?: string;
  /** Where a visitor without their personal link is helped (`/c/{slug}/rsvp`): «Busca tu enlace personal». */
  readonly rsvpHelpHref?: string;
  /**
   * The page is shared and server-rendered, so it cannot know whether the visitor holds their link. With this on, the help
   * button carries both faces («Busca tu enlace personal» / «Confirmar asistencia») stacked in one box, so a client island
   * can switch the face (`data-credential`) without moving anything. The destination is the same either way and never has a token.
   */
  readonly rsvpAdaptive?: boolean;
  /** The guest's gift list (`giftsPath`); never carries the guest's link. */
  readonly giftsHref: string;
  /** What the gift list holds; until the public view says it, OPEN. Only the button's label depends on it. */
  readonly giftsStatus?: GiftsStatus;
}

type Section = (props: SectionProps) => ReactNode;

function Story({ content }: SectionProps): ReactNode {
  return content.story.split("\n\n").filter(Boolean).map((paragraph) => <p key={paragraph.slice(0, 32)}>{paragraph}</p>);
}

function Schedule({ content, timeZone, locale, t }: SectionProps): ReactNode {
  const first = content.schedule[0];
  return (
    <>
      <ol className="celebration-schedule">
        {content.schedule.map((item) => (
          <li key={item.id}>
            <time dateTime={item.startsAt}>{formatTime(item.startsAt, timeZone, locale)}</time>
            <div><strong>{item.title}</strong>{item.description ? <p>{item.description}</p> : null}</div>
          </li>
        ))}
      </ol>
      {first ? <p className="celebration-note">{t("celebration.schedule.zoneNote", { zone: zoneLabel(first.startsAt, timeZone, locale), timeZone })}</p> : null}
    </>
  );
}

function Venues({ content, t }: SectionProps): ReactNode {
  const venues = shownVenues(content);
  return (
    <ul className="celebration-venues">
      {venues.map((venue) => (
        <li key={venue.key}>
          <p className="celebration-eyebrow">{t(`celebration.venues.kind.${venue.kind}`)}</p>
          <strong>{venue.name}</strong>
          {venue.address ? <p>{venue.address}</p> : null}
          <a href={navigationHref(venue)} target="_blank" rel="noopener noreferrer" data-link-kind="navigation">{t("celebration.venues.howToGetThere")}</a>
        </li>
      ))}
    </ul>
  );
}

function Gallery({ gallery, t }: SectionProps): ReactNode {
  const available = gallery.flatMap(({ id, width, height, variants }) => {
    const href = variants.full ?? variants.webp ?? variants.svg ?? variants.medium ?? variants.thumb;
    return href ? [{ media: { id, width, height, variants }, href }] : [];
  });
  const photos = available.map((photo, index) => {
    const label = t("celebration.gallery.photo", { n: index + 1, total: available.length });
    return { ...photo, label, openLabel: t("celebration.gallery.open", { label }) };
  });
  return <GalleryView photos={photos} labels={{ title: t("celebration.sections.gallery"), close: t("celebration.gallery.close"), previous: t("celebration.gallery.previous"), next: t("celebration.gallery.next") }} />;
}

function DressCode({ content }: SectionProps): ReactNode {
  return <p>{content.dressCode}</p>;
}

function Faq({ content }: SectionProps): ReactNode {
  return content.faq.map((item) => (
    <details key={item.question}>
      <summary>{item.question}</summary>
      <p>{item.answer}</p>
    </details>
  ));
}

function Recommendations({ content, t }: SectionProps): ReactNode {
  return (
    <ul className="celebration-recommendations">
      {content.recommendations.map((item) => (
        <li key={`${item.kind}-${item.name}`}>
          <p className="celebration-eyebrow">{t(`celebration.recommendations.kind.${item.kind}`)}</p>
          <strong>{item.name}</strong>
          {item.description ? <p>{item.description}</p> : null}
          {item.listingId ? <a href={partnerHref(item.listingId)} rel="sponsored nofollow" data-link-kind="partner">{t("celebration.recommendations.view")}</a> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * PL-A11: the reply always leads somewhere. With the personal link, «Confirmar asistencia»; without it, the help that
 * explains the personal link and lets an open celebration register the visitor (`/c/{slug}/rsvp`).
 */
export function RsvpAction({ t, rsvpHref, rsvpHelpHref, rsvpAdaptive, label, variant }: Pick<SectionProps, "t" | "rsvpHref" | "rsvpHelpHref" | "rsvpAdaptive"> & { readonly label?: string; readonly variant?: string }): ReactNode {
  const confirm = label ?? t("celebration.rsvp.cta");
  const action = rsvpHref
    ? <a className="celebration-cta" href={rsvpHref} data-link-kind="internal" data-action="rsvp" data-variant={variant}><ActionIcon name="check" /><span>{confirm}</span></a>
    : null;
  const help = !rsvpHref && rsvpHelpHref
    ? rsvpAdaptive
      ? (
        <a className="celebration-cta" href={rsvpHelpHref} data-link-kind="internal" data-action="rsvp-help" data-credential="absent" data-variant={variant}>
          <span className="celebration-cta-face" data-face="find"><ActionIcon name="invitation" /><span>{t("celebration.rsvp.findLink")}</span></span>
          <span className="celebration-cta-face" data-face="confirm" aria-hidden="true"><ActionIcon name="check" /><span>{confirm}</span></span>
        </a>
      )
      : <a className="celebration-cta" href={rsvpHelpHref} data-link-kind="internal" data-action="rsvp-help" data-variant={variant}><ActionIcon name="invitation" /><span>{t("celebration.rsvp.findLink")}</span></a>
    : null;
  return <>{action}{help}</>;
}

function Rsvp(props: SectionProps): ReactNode {
  return (
    <>
      <p>{props.t("celebration.rsvp.body")}</p>
      <RsvpAction {...props} />
    </>
  );
}

/**
 * P22 / PL-A10: the gifts button. Always `giftsHref` (`/c/{slug}/regalos`, never the guest's token); only its label depends on the
 * gift list's status, unless a design document gives it a label of its own.
 */
export function GiftsAction({ t, giftsHref, giftsStatus, label, variant, dock }: Pick<SectionProps, "t" | "giftsHref" | "giftsStatus"> & { readonly label?: string; readonly variant?: string; readonly dock?: boolean }): ReactNode {
  return <a className="celebration-cta" href={giftsHref} data-link-kind="internal" data-action="gifts" data-gifts-status={giftsStatus} data-variant={variant} data-dock={dock ? "" : undefined}><ActionIcon name="gifts" /><span>{label ?? t(GIFTS_CTA_KEYS[giftsStatus ?? "OPEN"])}</span></a>;
}

/**
 * P22 / PL-A10: the gifts button, present on every invitation. The list itself lives on its own page, which resolves the
 * guest's credential; this link never carries it.
 */
function Gifts(props: SectionProps): ReactNode {
  return (
    <>
      <p>{props.t("celebration.gifts.intro")}</p>
      <GiftsAction {...props} />
    </>
  );
}

export const SECTIONS: Readonly<Record<SectionId, Section>> = {
  story: Story,
  schedule: Schedule,
  venues: Venues,
  gallery: Gallery,
  dressCode: DressCode,
  faq: Faq,
  recommendations: Recommendations,
  gifts: Gifts,
  rsvp: Rsvp
};
