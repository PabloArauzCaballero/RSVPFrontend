import type { CSSProperties, ReactNode } from "react";
import { daysUntil, hasSectionContent, readContent, SECTION_PATHS, type GalleryImage, type PublicCelebrationView } from "./content.js";
import { formatDate } from "./format.js";
import { SECTIONS } from "./sections/index.js";
import { layoutOf, themeVariables, type ColorScheme } from "./theme.js";
import type { CelebrationTheme, SectionId, Translate } from "./types.js";

export interface CelebrationRendererProps {
  readonly theme: CelebrationTheme;
  readonly view: PublicCelebrationView;
  readonly gallery?: readonly GalleryImage[];
  readonly t: Translate;
  /** Render only this section (its own page); the hero is replaced by a compact header. */
  readonly only?: SectionId;
  /** Base path of the public site for the section navigation, e.g. "/c/ana-y-luis". */
  readonly basePath?: string;
  readonly rsvpHref?: string;
  /** Injected for deterministic rendering in tests and previews. */
  readonly now?: Date;
  readonly colorScheme?: ColorScheme;
}

function Hero({ props, cover }: { readonly props: CelebrationRendererProps; readonly cover?: GalleryImage }): ReactNode {
  const { view, t, theme } = props;
  const content = readContent(view);
  const layout = layoutOf(theme);
  const days = daysUntil(content.eventDate, props.now ?? new Date());
  const countdownKey = days ? "celebration.hero.countdown" : "celebration.hero.today";
  return (
    <header className="celebration-hero" data-hero={layout.hero}>
      {cover?.variants.full && layout.hero !== "compact" ? <img className="celebration-hero-image" src={cover.variants.full} alt="" fetchPriority="high" /> : null}
      <div className="celebration-hero-copy">
        <p className="celebration-eyebrow">{view.eventType.name}</p>
        <h1>{content.title}</h1>
        {content.hosts.length ? <p className="celebration-hosts">{content.hosts.map((host) => host.name).join(" & ")}</p> : null}
        {content.eventDate ? <p className="celebration-date"><time dateTime={content.eventDate}>{formatDate(content.eventDate, view.timeZone, view.locale)}</time></p> : null}
        {content.venueName ? <p className="celebration-venue">{content.venueName}</p> : null}
        {days !== null ? <p className="celebration-countdown">{t(countdownKey, { count: days })}</p> : null}
      </div>
    </header>
  );
}

function SectionNav({ props, sections }: { readonly props: CelebrationRendererProps; readonly sections: readonly SectionId[] }): ReactNode {
  const linked = sections.filter((section) => SECTION_PATHS[section]);
  if (!props.basePath || !linked.length) return null;
  return (
    <nav className="celebration-nav" aria-label={props.t("celebration.nav.label")}>
      <a href={props.basePath} aria-current={props.only ? undefined : "page"} data-link-kind="internal">{props.t("celebration.nav.home")}</a>
      {linked.map((section) => (
        <a key={section} href={`${props.basePath}/${SECTION_PATHS[section]}`} aria-current={props.only === section ? "page" : undefined} data-link-kind="internal">
          {props.t(`celebration.sections.${section}`)}
        </a>
      ))}
    </nav>
  );
}

/**
 * One component for every template (REQ-F09-03): the layout spec and the palette are data,
 * applied as data attributes and CSS custom properties. Sections without content are not
 * rendered at all, so a celebration without a dress code leaves no empty block.
 */
export function CelebrationRenderer(props: CelebrationRendererProps): ReactNode {
  const { theme, view, t } = props;
  const gallery = props.gallery ?? [];
  const content = readContent(view);
  const layout = layoutOf(theme);
  const available = theme.sections.filter((section) => hasSectionContent(section, content, gallery));
  const shown = props.only ? available.filter((section) => section === props.only) : available;
  // Custom properties are valid inline style keys; React passes them through untouched.
  const style = { ...themeVariables(theme, props.colorScheme) } as CSSProperties;
  return (
    <article className="celebration" data-layout={theme.layout} data-color-scheme={props.colorScheme ?? "light"} data-section-style={theme.sectionStyle} data-divider={layout.divider}
      data-align={layout.align} data-heading-case={layout.headingCase} data-images={layout.imageTreatment} lang={view.locale} style={style}>
      {props.only ? <header className="celebration-hero" data-hero="compact"><p className="celebration-eyebrow">{content.title}</p><h1>{t(`celebration.sections.${props.only}`)}</h1></header> : <Hero props={props} cover={gallery.find((image) => image.isCover)} />}
      <SectionNav props={props} sections={available} />
      <main className="celebration-sections">
        {shown.map((section) => {
          const Body = SECTIONS[section];
          const headingId = `section-${section}`;
          return (
            <section key={section} id={section} data-section={section} aria-labelledby={headingId}>
              {/* On a section's own page the h1 already names it; the h2 stays for the outline only. */}
              <h2 id={headingId} className={props.only ? "celebration-visually-hidden" : undefined}>{t(`celebration.sections.${section}`)}</h2>
              <Body content={content} gallery={gallery} timeZone={view.timeZone} locale={view.locale} t={t} rsvpHref={props.rsvpHref} />
            </section>
          );
        })}
      </main>
    </article>
  );
}
