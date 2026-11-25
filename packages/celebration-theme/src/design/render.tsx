import { Fragment, type CSSProperties, type ReactNode } from "react";
import { artPalette, artVariables } from "../art/palette.js";
import { drawingById, InvitationArt, ornamentSetById, OrnamentCorner, OrnamentFrame, OrnamentSeparator } from "../art/index.js";
import { daysUntil, giftsPath, hasSectionContent, partnerHref, readContent, SECTION_PATHS, sectionTitleKey, type CelebrationContent, type GalleryImage, type PublicCelebrationView } from "../content.js";
import { Dock } from "../dock.js";
import { Flourish } from "../flourish.js";
import { formatDate } from "../format.js";
import type { CelebrationRendererProps } from "../renderer.js";
import { SectionNav } from "../section-nav.js";
import { GiftsAction, RsvpAction, SECTIONS } from "../sections/index.js";
import { AudioPlayer, EmbedFacade, MediaBackdrop, MediaImage } from "../media/components.js";
import { embedFromConfig, mapEmbed } from "../media/embed.js";
import { clampScrim, type PublicMedia } from "../media/variants.js";
import { layoutOf, themeVariables } from "../theme.js";
import type { CelebrationTheme, SectionId, Translate } from "../types.js";
import { scopeCss } from "../custom/css.js";
import { requiredScrim } from "./colour.js";
import { designPalette, fontStack } from "./read.js";
import type { DesignBackground, PaletteRole, DesignBlock, DesignCanvas, DesignDocumentV2, DesignElement, DesignLink, DesignPage } from "./types.js";

/**
 * F4 b · the renderer of the design document v2 (web). The document is data: tokens become CSS custom properties, every page
 * is a canvas of elements placed on a grid (one canvas for the phone, an optional one from 900 px up), and every element names
 * a block of the registry. Nothing here knows a template by name; the three prototyped ones (Marfil, Piñata, Gala art déco) are
 * documents like any other.
 *
 * What the document cannot take away (P22): the gifts button. Whatever the canvases say, `Dock` carries «Ver regalos»
 * (`/c/{slug}/regalos`, no token) at the bottom of the phone and at the top of the desktop, so the visitor always finds the
 * flow that is the business model. Every provider link goes through `/r/{listingId}`.
 */

export type DesignRendererProps = CelebrationRendererProps & { readonly design: DesignDocumentV2 };

interface Context {
  readonly props: DesignRendererProps;
  readonly design: DesignDocumentV2;
  readonly theme: CelebrationTheme;
  readonly view: PublicCelebrationView;
  readonly content: CelebrationContent;
  /** The ordered photos (gallery and cover): what the gallery section and the cover show. */
  readonly gallery: readonly GalleryImage[];
  /** Every public file of the celebration, whatever its purpose: what blocks and backgrounds of the document point at by id. */
  readonly media: readonly GalleryImage[];
  /** Veil opacity each scheme needs over any picture so the text on it reads at AA. */
  readonly veil: { readonly light: number; readonly dark: number };
  readonly cover?: GalleryImage;
  readonly t: Translate;
  readonly giftsHref: string;
  readonly now: Date;
}

const ROLE_VAR: Readonly<Record<PaletteRole, string>> = {
  canvas: "var(--celebration-canvas)", surface: "var(--celebration-surface)", text: "var(--celebration-text)", muted: "var(--celebration-muted)",
  accent: "var(--celebration-accent)", accentFill: "var(--celebration-accent-fill)", onAccent: "var(--celebration-on-accent)", line: "var(--celebration-line)"
};
const role = (value: PaletteRole | undefined): string | undefined => (value && Object.hasOwn(ROLE_VAR, value) ? ROLE_VAR[value] : undefined);
const FONT_VAR = { heading: "var(--celebration-heading-font)", body: "var(--celebration-body-font)", monogram: "var(--celebration-monogram-font)" } as const;
const BIG_TEXT = 40;
const PHOTO_PURPOSES: readonly (string | undefined)[] = [undefined, "gallery", "cover"];
const isPhoto = (item: GalleryImage): boolean => PHOTO_PURPOSES.includes(item.purpose);
/** A public file as the media components read it. */
const asMedia = (item: GalleryImage): PublicMedia => ({ id: item.id, width: item.width, height: item.height, variants: item.variants });
const COVER_SIZES = "(min-width: 56.25rem) 40rem, 100vw";
const FLUID_DIVISOR = 4.2;

function config(block: DesignBlock): Readonly<Record<string, unknown>> {
  return block.config;
}
const str = (value: unknown): string | undefined => (typeof value === "string" && value ? value : undefined);

/** Where a link of the document goes. A provider always goes through the redirector; a gifts link never carries a token. */
function hrefOf(link: DesignLink | undefined, context: Context): string | undefined {
  if (!link) return undefined;
  switch (link.kind) {
    case "gifts": return context.giftsHref;
    case "rsvp": return context.props.rsvpHref ?? context.props.rsvpHelpHref;
    case "listing": return partnerHref(link.listingId);
    case "section": {
      const path = Object.hasOwn(SECTION_PATHS, link.section) ? SECTION_PATHS[link.section as SectionId] : undefined;
      return context.props.basePath && path ? `${context.props.basePath}/${path}` : undefined;
    }
    case "url": return /^https:\/\/[^\s]+$/.test(link.href) ? link.href : undefined;
  }
}

function backgroundStyle(background: DesignBackground | undefined): CSSProperties {
  return background?.kind === "colour" ? { background: role(background.role) } : {};
}

/** A page or element background that is a picture (F6): AVIF/WebP, with the veil the palette needs so the text on top is AA; the document's own veil can only add to it. */
function BackgroundMedia({ background, context, priority = false }: { readonly background: DesignBackground | undefined; readonly context: Context; readonly priority?: boolean }): ReactNode {
  if (background?.kind !== "media") return null;
  const file = context.media.find((item) => item.id === background.mediaId);
  if (!file) return null;
  const own = background.scrim === undefined ? 0 : clampScrim(background.scrim);
  return <MediaBackdrop media={asMedia(file)} fit={background.fit} light={Math.max(own, context.veil.light)} dark={Math.max(own, context.veil.dark)} priority={priority} />;
}

function BackgroundArt({ background }: { readonly background: DesignBackground | undefined }): ReactNode {
  if (background?.kind !== "illustration") return null;
  const drawing = drawingById(background.illustrationId);
  return drawing ? <InvitationArt drawing={drawing} className="cdesign-bg-art" /> : null;
}

/** The title block of the cover: who, when and where. The photo, when there is one, is part of the same block (PL-A9: every template decides where it goes). */
function CoverBlock({ block, context }: { readonly block: DesignBlock; readonly context: Context }): ReactNode {
  const { content, view, t, cover } = context;
  const image = cover && (cover.variants.medium || cover.variants.full || cover.variants.webp || cover.variants.svg) ? asMedia(cover) : null;
  // A title made of the hosts' names ("Ana y Luis") already says who: repeating them underneath is noise.
  const hostsInTitle = content.hosts.length > 0 && content.hosts.every((host) => content.title.includes(host.name));
  const days = daysUntil(content.eventDate, context.now);
  return (
    <div className="cdesign-cover" data-variant={str(config(block)["variant"])} data-has-image={image ? "true" : "false"}>
      {image ? <MediaImage media={image} alt="" priority sizes={COVER_SIZES} className="cdesign-cover-photo" /> : null}
      <div className="cdesign-cover-copy">
        <h1>{content.title}</h1>
        {content.hosts.length && !hostsInTitle ? <p className="celebration-hosts">{content.hosts.map((host) => host.name).join(" & ")}</p> : null}
        {content.eventDate ? <p className="celebration-date"><time dateTime={content.eventDate}>{formatDate(content.eventDate, view.timeZone, view.locale)}</time></p> : null}
        {content.venueName ? <p className="celebration-venue">{content.venueName}</p> : null}
        {days !== null && str(config(block)["countdown"]) !== "off" ? <p className="celebration-countdown">{t(days ? "celebration.hero.countdown" : "celebration.hero.today", { count: days })}</p> : null}
      </div>
    </div>
  );
}

const initialsOf = (names: readonly string[]): string => names.map((name) => [...name.trim()][0]?.toUpperCase() ?? "").join("");

/** An ornament set id names a separator; `-esquina` and `-marco` name its corner and its frame (the decorative frame of Gala art déco). */
function OrnamentArt({ id, animate }: { readonly id: string; readonly animate: boolean }): ReactNode {
  const frame = id.endsWith("-marco") ? ornamentSetById(id.slice(0, -"-marco".length)) : undefined;
  if (frame) return <OrnamentFrame set={frame} className="cdesign-frame" animate={animate} />;
  const corner = id.endsWith("-esquina") ? ornamentSetById(id.slice(0, -"-esquina".length)) : undefined;
  if (corner) return <OrnamentCorner set={corner} className="cdesign-corner" animate={animate} />;
  const set = ornamentSetById(id);
  return set ? <OrnamentSeparator set={set} className="cdesign-ornament" animate={animate} /> : null;
}

function BlockBody({ block, element, context }: { readonly block: DesignBlock; readonly element: DesignElement; readonly context: Context }): ReactNode {
  const { props, content, gallery, view, t } = context;
  const settings = config(block);
  const draw = element.animation?.entrance === "draw" || settings["drawOnEnter"] === true;
  const sectionProps = {
    content, gallery, timeZone: view.timeZone, locale: view.locale, t, rsvpHref: props.rsvpHref, rsvpHelpHref: props.rsvpHelpHref, rsvpAdaptive: props.rsvpAdaptive,
    giftsHref: context.giftsHref, giftsStatus: props.giftsStatus
  };
  switch (block.type) {
    case "cover": return <CoverBlock block={block} context={context} />;
    case "giftsCta": return <GiftsAction {...sectionProps} label={str(settings["label"])} variant={str(settings["style"])} />;
    case "rsvpCta": return <RsvpAction {...sectionProps} label={str(settings["label"])} variant={str(settings["style"])} />;
    case "story": case "schedule": case "venues": case "gallery": case "faq": case "recommendations": {
      const Body = SECTIONS[block.type];
      return <div className="cdesign-section-body" data-display={str(settings["display"])}><Body {...sectionProps} /></div>;
    }
    case "dressCode": return <div className="cdesign-section-body"><SECTIONS.dressCode {...sectionProps} /></div>;
    case "illustration": {
      const id = str(settings["illustrationId"]) ?? "";
      const drawing = drawingById(id);
      return drawing ? <InvitationArt drawing={drawing} className="cdesign-art" animate={draw} /> : <OrnamentArt id={id} animate={draw} />;
    }
    case "ornament": return str(settings["ornament"]) === "rule" ? <span className="celebration-rule" aria-hidden="true" /> : <Flourish />;
    case "monogram": {
      const text = str(settings["initials"]) ?? initialsOf(content.hosts.map((host) => host.name));
      return text ? <p className="cdesign-monogram" aria-hidden="true">{text}</p> : null;
    }
    case "countdown": {
      const days = daysUntil(content.eventDate, context.now);
      return days === null ? null : <p className="celebration-countdown">{t(days ? "celebration.hero.countdown" : "celebration.hero.today", { count: days })}</p>;
    }
    case "heading": {
      const level = Math.min(3, Math.max(2, Number(settings["level"]) || 2));
      const Tag = `h${level}` as "h2" | "h3";
      return <Tag className="cdesign-heading">{str(settings["text"])}</Tag>;
    }
    case "text": return <p className="cdesign-text">{str(settings["text"])}</p>;
    case "quote": return <blockquote className="cdesign-quote"><p>{str(settings["text"])}</p></blockquote>;
    case "spacer": return <span className="cdesign-spacer" aria-hidden="true" />;
    case "button": {
      const href = hrefOf(element.link, context);
      const label = str(settings["label"]);
      return href && label ? <a className="celebration-cta" href={href} data-variant={str(settings["style"])} {...linkAttributes(element.link)}><span>{label}</span></a> : null;
    }
    case "image": {
      const file = context.media.find((item) => item.id === settings["mediaId"]);
      return file ? <MediaImage media={asMedia(file)} alt={str(settings["alt"]) ?? ""} fit={settings["fit"] === "contain" ? "contain" : "cover"} sizes="(min-width: 56.25rem) 50vw, 100vw" className="cdesign-image" /> : null;
    }
    // F6 (P17): nothing of the provider loads until the guest taps. An id or link off the allowlist draws nothing.
    case "video": return <EmbedFacade embed={embedFromConfig("video", settings)} title={content.title} t={t} />;
    case "music": {
      if (settings["source"] === "media") {
        const file = context.media.find((item) => item.id === settings["ref"]);
        return file?.variants.audio ? <AudioPlayer media={{ ...asMedia(file), durationMs: file.durationMs ?? null }} title={content.title} t={t} /> : null;
      }
      return <EmbedFacade embed={embedFromConfig("music", settings)} title={content.title} t={t} />;
    }
    case "map": {
      const venue = content.venues[Number(settings["venueIndex"])];
      const query = venue ? [venue.name, venue.address].filter(Boolean).join(", ") : "";
      return venue ? <EmbedFacade embed={mapEmbed(query)} title={venue.name} t={t} /> : null;
    }
    // Blocks the renderer does not draw yet (wedding party, free HTML) are left out, never half-drawn.
    default: return null;
  }
}

function linkAttributes(link: DesignLink | undefined): Readonly<Record<string, string>> {
  if (link?.kind === "url") return { target: "_blank", rel: "noopener noreferrer nofollow", "data-link-kind": "external" };
  if (link?.kind === "listing") return { rel: "sponsored nofollow", "data-link-kind": "partner" };
  return { "data-link-kind": "internal" };
}

/** A fluid size: the document's pixels on a wide screen, scaled down with the viewport so a long name never leaves the phone. */
function fontSize(size: number): string {
  return size >= BIG_TEXT ? `clamp(${Math.round(size / 2)}px, ${(size / FLUID_DIVISOR).toFixed(2)}vw, ${size}px)` : `${size}px`;
}

function elementStyle(element: DesignElement, mobile: DesignElement | undefined, desktop: DesignElement | undefined): CSSProperties {
  const style: Record<string, string | number | undefined> = {};
  const set = (prefix: string, item: DesignElement | undefined): void => {
    if (!item) return;
    style[`--${prefix}x`] = item.x + 1; style[`--${prefix}y`] = item.y + 1; style[`--${prefix}w`] = item.w; style[`--${prefix}h`] = item.h;
  };
  set("m", mobile);
  set("d", desktop);
  const box = (value: DesignElement["padding"]): string | undefined => (value ? `${value.top}px ${value.right}px ${value.bottom}px ${value.left}px` : undefined);
  const { typography, border } = element;
  const sized = typography?.size !== undefined;
  return {
    ...style,
    ...(element.margin ? { "--cd-margin": box(element.margin) } : {}),
    ...(typography?.colour ? { "--cd-ink": role(typography.colour) } : {}),
    ...(sized ? { "--cd-size": fontSize(typography.size as number) } : {}),
    zIndex: element.z,
    padding: box(element.padding),
    borderRadius: element.radius,
    border: border ? `${border.width}px ${border.style} ${role(border.colour)}` : undefined,
    opacity: element.opacity,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    ...backgroundStyle(element.background),
    ...(typography ? {
      fontFamily: typography.role ? FONT_VAR[typography.role] : undefined, fontSize: sized ? fontSize(typography.size as number) : undefined, fontWeight: typography.weight,
      textAlign: typography.align === "start" ? "start" : typography.align === "end" ? "end" : typography.align, lineHeight: typography.lineHeight,
      letterSpacing: typography.letterSpacing === undefined ? undefined : `${typography.letterSpacing}em`, textTransform: typography.transform, color: role(typography.colour)
    } : {}),
    ...(element.animation ? { "--cdesign-delay": `${element.animation.delayMs ?? 0}ms`, "--cdesign-duration": `${element.animation.durationMs ?? 700}ms` } : {})
  } as CSSProperties;
}

function Canvas({ page, context }: { readonly page: DesignPage; readonly context: Context }): ReactNode {
  const { mobile, desktop } = page.canvases;
  const byId = (canvas: DesignCanvas | undefined): Map<string, DesignElement> => new Map((canvas?.elements ?? []).filter((item) => item.visible).map((item) => [item.id, item]));
  const phone = byId(mobile);
  const wide = byId(desktop);
  const ids = [...new Set([...phone.keys(), ...wide.keys()])];
  const blocks = new Map(context.design.blocks.map((block) => [block.id, block]));
  const vars = { "--cd-cols-m": mobile.columns, "--cd-row-m": `${mobile.rowHeight}px`, "--cd-cols-d": desktop?.columns ?? mobile.columns, "--cd-row-d": `${(desktop ?? mobile).rowHeight}px` } as CSSProperties;
  return (
    <div className="cdesign-canvas" data-mode={mobile.mode} data-desktop={desktop ? "" : undefined} style={vars}>
      {ids.map((id) => {
        const element = (phone.get(id) ?? wide.get(id)) as DesignElement;
        const block = blocks.get(element.block);
        if (!block) return null;
        const body = <BlockBody block={block} element={element} context={context} />;
        const href = block.type === "button" || block.type === "giftsCta" || block.type === "rsvpCta" ? undefined : hrefOf(element.link, context);
        return (
          <div key={id} className={block.type === "giftsCta" || block.type === "rsvpCta" ? "cdesign-el rsvp-protected" : "cdesign-el"} data-block={block.type} data-m={phone.has(id) ? "" : undefined} data-d={wide.has(id) || (!desktop && phone.has(id)) ? "" : undefined}
            data-entrance={element.animation && element.animation.entrance !== "none" ? element.animation.entrance : undefined} data-sized={element.typography?.size !== undefined ? "" : undefined} data-round={element.radius ? "" : undefined} data-bg-media={element.background?.kind === "media" ? "" : undefined}
            style={elementStyle(element, phone.get(id), wide.get(id) ?? (desktop ? undefined : phone.get(id)))}>
            <BackgroundMedia background={element.background} context={context} />
            {href ? <a href={href} className="cdesign-el-link" {...linkAttributes(element.link)}>{body}</a> : body}
          </div>
        );
      })}
    </div>
  );
}

const NOT_COLOUR = new Set(["--celebration-radius", "--celebration-gap", "--celebration-max-width", "--celebration-heading-scale"]);
const isColourVariable = (name: string): boolean => name.startsWith("--celebration-") && !name.endsWith("-font") && !NOT_COLOUR.has(name);

/**
 * The colours of both schemes as rules, not inline (an inline value always wins over a media query, so the dark palette could never
 * apply): light as the base and the document's own dark palette under `prefers-color-scheme: dark`, both scoped to the article that
 * follows the system. Values come from `readDesign`, which accepts only `#RRGGBB`, and from art colour mixes computed from them.
 */
function SystemColours({ theme }: { readonly theme: CelebrationTheme }): ReactNode {
  const rule = (scheme: "light" | "dark"): string => Object.entries(themeVariables(theme, scheme)).filter(([name]) => isColourVariable(name)).map(([name, value]) => `${name}:${value}`).join(";");
  const scope = '.celebration-design[data-scheme-source="system"]';
  return <style>{`${scope}{${rule("light")};color-scheme:light}@media (prefers-color-scheme:dark){${scope}{${rule("dark")};color-scheme:dark}}`}</style>;
}

/** The invitation's root class: every rule of the author's stylesheet is rebuilt under it. */
const CUSTOM_SCOPE = ".celebration-design";

/**
 * The advanced CSS of the document (F5, P12). It is not trusted: it is parsed and rebuilt from the typed allowlist of F5 (`custom/css.ts`, a copy of the
 * one in the editor, FE #122): every selector under the root class and away from the gifts and reply buttons (`.rsvp-protected`), no escapes, no
 * `@import`, `image-set()`, `attr()`, `expression()`, and `url()` only toward the media store. The result goes in as the TEXT of a `<style>`
 * (React sets `textContent`; never `innerHTML`), and "<" cannot occur in it. What the allowlist drops is simply not painted.
 */
export function CustomCss({ design }: { readonly design: DesignDocumentV2 }): ReactNode {
  const source = typeof design.custom?.css === "string" ? design.custom.css : "";
  if (!source.trim()) return null;
  const { css } = scopeCss(source, { scope: CUSTOM_SCOPE });
  return css ? <style data-celebration-custom="">{css}</style> : null;
}

function PageBlock({ page, context, only }: { readonly page: DesignPage; readonly context: Context; readonly only?: SectionId }): ReactNode {
  const { t } = context;
  const section = page.section as SectionId | undefined;
  const inner = <><BackgroundArt background={page.background} /><BackgroundMedia background={page.background} context={context} priority={page.kind === "cover"} /><Canvas page={page} context={context} /></>;
  if (page.kind === "cover") {
    return <header className="cdesign-page" data-page-kind="cover" data-page={page.id} data-style={page.style} data-bg-media={page.background?.kind === "media" ? "" : undefined} style={backgroundStyle(page.background)}>{inner}</header>;
  }
  if (!section) return null;
  const headingId = `section-${section}`;
  return (
    <section id={section} className="cdesign-page" data-page-kind="section" data-section={section} data-page={page.id} data-style={page.style} data-bg-media={page.background?.kind === "media" ? "" : undefined} aria-labelledby={headingId} style={backgroundStyle(page.background)}>
      <h2 id={headingId} className={only ? "celebration-visually-hidden" : "cdesign-page-title"}>{t(sectionTitleKey(section))}</h2>
      {section === "gifts" || section === "rsvp" ? <div className="cdesign-intro"><p>{t(`celebration.${section}.${section === "gifts" ? "intro" : "body"}`)}</p></div> : null}
      {inner}
    </section>
  );
}

export function DesignRenderer(props: DesignRendererProps): ReactNode {
  const { theme, view, design, t } = props;
  const media = props.gallery ?? [];
  const gallery = media.filter(isPhoto);
  const content = readContent(view);
  const layout = layoutOf(theme);
  const scheme = props.colorScheme;
  const palette = designPalette(design, scheme ?? "light");
  const cover = gallery.find((image) => image.isCover);
  const veil = { light: requiredScrim(designPalette(design, "light")), dark: requiredScrim(designPalette(design, "dark")) };
  const context: Context = { props, design, theme, view, content, gallery, media, veil, ...(cover ? { cover } : {}), t, giftsHref: giftsPath(view.slug), now: props.now ?? new Date() };
  const available = theme.sections.filter((section) => hasSectionContent(section, content, gallery));
  const monogram = design.tokens.typography.monogram;
  // Following the system, the colours live in `SystemColours` rules; a forced scheme sets them inline.
  const style = {
    ...Object.fromEntries(Object.entries(themeVariables(theme, scheme ?? "light")).filter(([name]) => scheme !== undefined || !isColourVariable(name))),
    "--celebration-monogram-font": monogram ? fontStack(monogram) : "var(--celebration-heading-font)",
    "--celebration-space": "clamp(1rem, 4vw, 2rem)",
    ...(scheme ? artVariables(artPalette(palette)) : {})
  } as CSSProperties;
  const placed = design.pages.filter((page) => page.kind === "cover" || (page.section && available.includes(page.section as SectionId)));
  const pages = props.only ? placed.filter((page) => page.kind === "section" && page.section === props.only) : placed;
  return (
    <article className="celebration celebration-design" data-design="2" data-layout={theme.layout} data-color-scheme={scheme ?? "light"} data-scheme-source={scheme ? "prop" : "system"}
      data-section-style={theme.sectionStyle} data-divider={layout.divider} data-images={layout.imageTreatment} lang={view.locale} style={style}>
      {scheme ? null : <SystemColours theme={theme} />}
      <CustomCss design={design} />
      <Dock t={t} giftsHref={context.giftsHref} giftsStatus={props.giftsStatus} rsvpHref={props.rsvpHref} rsvpHelpHref={props.rsvpHelpHref} rsvpAdaptive={props.rsvpAdaptive} />
      {props.only ? <header className="celebration-hero" data-hero="compact"><p className="celebration-eyebrow">{content.title}</p><h1>{t(`celebration.sections.${props.only}`)}</h1></header> : null}
      {props.only ? <SectionNav props={props} sections={available} /> : null}
      <main className="cdesign-pages">
        {pages.map((page, index) => (
          <Fragment key={page.id}>
            <PageBlock page={page} context={context} {...(props.only ? { only: props.only } : {})} />
            {/* The section links sit under the cover, so the first screen says who and when before it lists sections. */}
            {!props.only && index === 0 ? <SectionNav props={props} sections={available} /> : null}
          </Fragment>
        ))}
      </main>
    </article>
  );
}
