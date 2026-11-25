import type { CSSProperties, ReactNode } from "react";
import { daysUntil, giftsPath, hasSectionContent, readContent, SECTION_PATHS, sectionTitleKey, type GalleryImage, type GiftsStatus, type PublicCelebrationView } from "./content.js";
import { drawingById, InvitationArt, ornamentSetById, OrnamentSeparator } from "./art/index.js";
import { formatDate } from "./format.js";
import { SECTION_ART } from "./hero-art.js";
import { DesignRenderer } from "./design/render.js";
import { Dock } from "./dock.js";
import { Flourish } from "./flourish.js";
import { SectionNav } from "./section-nav.js";
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
  /** The visitor's own reply page (they hold their personal link): the reply section offers «Confirmar asistencia». */
  readonly rsvpHref?: string;
  /** Without a personal link: where the reply section sends the visitor to find it (`/c/{slug}/rsvp`). */
  readonly rsvpHelpHref?: string;
  /** Render the help button with both faces so a client island can show «Confirmar asistencia» to a visitor who holds their link (see `SectionProps`). */
  readonly rsvpAdaptive?: boolean;
  /** What the gift list holds (rsvp-f1's `gifts.status`); absent means OPEN. Only the gifts button's label changes. */
  readonly giftsStatus?: GiftsStatus;
  /** Injected for deterministic rendering in tests and previews. */
  readonly now?: Date;
  readonly colorScheme?: ColorScheme;
}

/**
 * The cover of the invitation: who, when and where, composed by the layout (`data-hero`) and with or without a photo
 * (`data-has-image`), so a template without a cover picture still gets a designed cover instead of bare text.
 */
function Hero({ props, cover }: { readonly props: CelebrationRendererProps; readonly cover?: GalleryImage }): ReactNode {
  const { view, t, theme } = props;
  const content = readContent(view);
  const layout = layoutOf(theme);
  const days = daysUntil(content.eventDate, props.now ?? new Date());
  const countdownKey = days ? "celebration.hero.countdown" : "celebration.hero.today";
  const image = cover?.variants.full ?? null;
  const heroDrawing = theme.heroArt ? drawingById(theme.heroArt) : undefined;
  const ornamentSet = theme.ornamentSet ? ornamentSetById(theme.ornamentSet) : undefined;
  // A title made of the hosts' names ("Ana y Luis") already says who: repeating them underneath is noise.
  const hostsInTitle = content.hosts.length > 0 && content.hosts.every((host) => content.title.includes(host.name));
  return (
    <header className="celebration-hero" data-hero={layout.hero} data-has-image={image ? "true" : "false"}>
      {image ? <img className="celebration-hero-image" src={image} alt="" fetchPriority="high" /> : null}
      <div className="celebration-hero-copy">
        {heroDrawing ? <InvitationArt drawing={heroDrawing} className="celebration-hero-art" animate /> : null}
        <h1>{content.title}</h1>
        {content.hosts.length && !hostsInTitle ? <p className="celebration-hosts">{content.hosts.map((host, index) => <span key={host.role}>{index ? <span className="celebration-amp"> &amp; </span> : null}{host.name}</span>)}</p> : null}
        {layout.divider === "ornament" && ornamentSet ? <OrnamentSeparator set={ornamentSet} className="celebration-ornament" /> : layout.divider === "ornament" ? <Flourish /> : <span className="celebration-rule" aria-hidden="true" />}
        {content.eventDate ? <p className="celebration-date"><time dateTime={content.eventDate}>{formatDate(content.eventDate, view.timeZone, view.locale)}</time></p> : null}
        {content.venueName ? <p className="celebration-venue">{content.venueName}</p> : null}
        {days !== null ? <p className="celebration-countdown">{t(countdownKey, { count: days })}</p> : null}
      </div>
    </header>
  );
}

/** The small drawing that heads a section: decorative, on the page ground, never the only carrier of meaning. */
function SectionDrawing({ id }: { readonly id: string | undefined }): ReactNode {
  const drawing = id ? drawingById(id) : undefined;
  return drawing ? <InvitationArt drawing={drawing} className="celebration-section-art" animate /> : null;
}

/**
 * One component for every template (REQ-F09-03): the layout spec and the palette are data,
 * applied as data attributes and CSS custom properties. Sections without content are not
 * rendered at all, so a celebration without a dress code leaves no empty block.
 */
export function CelebrationRenderer(props: CelebrationRendererProps): ReactNode {
  const { theme, view, t } = props;
  // F4 b: a design document v2 is drawn from its pages and canvases; v1 templates keep the layout engine below.
  if (theme.design) return <DesignRenderer {...props} design={theme.design} />;
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
      <Dock t={t} giftsHref={giftsPath(view.slug)} giftsStatus={props.giftsStatus} rsvpHref={props.rsvpHref} rsvpHelpHref={props.rsvpHelpHref} rsvpAdaptive={props.rsvpAdaptive} />
      {props.only ? <header className="celebration-hero" data-hero="compact"><p className="celebration-eyebrow">{content.title}</p><h1>{t(`celebration.sections.${props.only}`)}</h1></header> : <Hero props={props} cover={gallery.find((image) => image.isCover)} />}
      <SectionNav props={props} sections={available} />
      <main className="celebration-sections">
        {shown.map((section) => {
          const Body = SECTIONS[section];
          const headingId = `section-${section}`;
          return (
            <section key={section} id={section} data-section={section} aria-labelledby={headingId}>
              {/* On a section's own page the h1 already names it; the h2 stays for the outline only. */}
              {layout.sectionArt && !props.only && SECTION_ART[section] ? <SectionDrawing id={SECTION_ART[section]} /> : null}
              <h2 id={headingId} className={props.only ? "celebration-visually-hidden" : undefined}>{t(sectionTitleKey(section))}</h2>
              <Body content={content} gallery={gallery} timeZone={view.timeZone} locale={view.locale} t={t} rsvpHref={props.rsvpHref} rsvpHelpHref={props.rsvpHelpHref} rsvpAdaptive={props.rsvpAdaptive}
                giftsHref={giftsPath(view.slug)} giftsStatus={props.giftsStatus} />
            </section>
          );
        })}
      </main>
    </article>
  );
}
