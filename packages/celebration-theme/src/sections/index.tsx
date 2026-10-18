import type { ReactNode } from "react";
import { navigationHref, partnerHref, type CelebrationContent, type GalleryImage } from "../content.js";
import { formatTime, zoneLabel } from "../format.js";
import type { SectionId, Translate } from "../types.js";

/** What every section receives. Sections never fetch and never hold copy of their own. */
export interface SectionProps {
  readonly content: CelebrationContent;
  readonly gallery: readonly GalleryImage[];
  readonly timeZone: string;
  readonly locale: string;
  readonly t: Translate;
  /** Where the RSVP call to action points (the guest's magic link lives in their invitation). */
  readonly rsvpHref?: string;
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
  const venues = content.venues.length ? content.venues : [{ key: "main", kind: "other" as const, name: content.venueName }];
  return (
    <ul className="celebration-venues">
      {venues.map((venue) => (
        <li key={venue.key}>
          <p className="celebration-eyebrow">{t(`celebration.venues.kind.${venue.kind}`)}</p>
          <strong>{venue.name}</strong>
          {"address" in venue && venue.address ? <p>{venue.address}</p> : null}
          <a href={navigationHref(venue)} target="_blank" rel="noopener noreferrer" data-link-kind="navigation">{t("celebration.venues.howToGetThere")}</a>
        </li>
      ))}
    </ul>
  );
}

const IMAGE_WIDTHS = { thumb: 320, medium: 960, full: 1920 } as const;

function Gallery({ gallery, t }: SectionProps): ReactNode {
  return (
    <ul className="celebration-gallery">
      {gallery.map((image, index) => {
        const srcSet = (["thumb", "medium", "full"] as const)
          .filter((size) => image.variants[size])
          .map((size) => `${image.variants[size]} ${IMAGE_WIDTHS[size]}w`).join(", ");
        const label = t("celebration.gallery.photo", { n: index + 1, total: gallery.length });
        return (
          <li key={image.id}>
            <a href={image.variants.full ?? image.variants.webp} data-link-kind="image" aria-label={t("celebration.gallery.open", { label })}>
              <img src={image.variants.medium ?? image.variants.webp} srcSet={srcSet || undefined} sizes="(min-width: 768px) 33vw, 100vw" alt={label}
                width={image.width ?? undefined} height={image.height ?? undefined} loading={index ? "lazy" : "eager"} decoding="async" />
            </a>
          </li>
        );
      })}
    </ul>
  );
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

function Rsvp({ t, rsvpHref }: SectionProps): ReactNode {
  return (
    <>
      <p>{t("celebration.rsvp.body")}</p>
      {rsvpHref ? <a className="celebration-cta" href={rsvpHref} data-link-kind="internal">{t("celebration.rsvp.cta")}</a> : null}
    </>
  );
}

/** Gift lists are owned by lane F22 and render on their own page. */
const Gifts: Section = () => null;

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
