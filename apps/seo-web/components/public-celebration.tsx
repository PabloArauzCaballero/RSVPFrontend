import { CelebrationRenderer, fontStylesheet, hasOwnMusic, themeFromTemplate, type SectionId } from "@rsvp/celebration-theme";
import { createTranslator, supportedLocales } from "@rsvp/i18n/server";
import { marketplacePath } from "@rsvp/query-hooks";
import type { PublicPage } from "../lib/celebration";
import { visualTestNow } from "../lib/dev-surfaces";
import { eventJsonLd, jsonLdScript } from "../lib/json-ld";
import { uiLocale } from "../lib/locale";
import { celebrationPath, siteUrl } from "../lib/metadata";
import { earlyCredentialScript } from "../lib/guest-credential";
import { ReportInvitation } from "./report-invitation";
import { guestApiBase } from "../lib/guest-client";
import { RsvpCredentialIsland } from "./rsvp-credential-island";

/** Map settings of the backend (tile server and attribution at run time); the page falls back to OpenStreetMap's own server when it cannot be read. */
const mapConfigUrl = (): string => `${guestApiBase().replace(/\/$/, "")}/providers/geo/map-config`;

/** The public celebration (A1) or one of its sections (A2–A8), server-rendered with its theme. */
export function PublicCelebration({ page, only, providersEntry = false }: { readonly page: PublicPage; readonly only?: SectionId; /** The deployment offers the guest marketplace and the catalogue has providers (lib/marketplace `showMarketplaceEntry`). */ readonly providersEntry?: boolean }) {
  const { view, template, gallery } = page;
  const locale = uiLocale(view.locale);
  const t = createTranslator(locale);
  const theme = themeFromTemplate(template, view.enabledSections);
  const fonts = fontStylesheet(theme);
  const basePath = celebrationPath(view.slug);
  const jsonLd = only ? null : eventJsonLd(view, gallery, `${siteUrl()}${basePath}`);
  const languages = view.availableLocales.filter((candidate) => (supportedLocales as readonly string[]).includes(candidate));
  return (
    <>
      {/* The invitation is the guest's page: the site's sales navigation and pitch step back (see `body:has([data-quiet-chrome])` in globals.css). */}
      <span hidden data-quiet-chrome="" />
      {/* PL-134-M1: a credential in the fragment is stored and the address cleaned before anything of a third party can load. */}
      <script dangerouslySetInnerHTML={{ __html: earlyCredentialScript(view.slug) }} />
      {fonts ? <link rel="stylesheet" href={fonts} precedence="default" /> : null}
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} /> : null}
      {languages.length > 1 ? (
        <nav className="celebration-languages" aria-label={t("celebration.language.label")}>
          {languages.map((candidate) => (
            <a key={candidate} href={`?lang=${candidate}`} hrefLang={candidate} lang={candidate} aria-current={candidate === view.locale ? "true" : undefined} data-link-kind="internal">
              {t(`celebration.language.${candidate}`)}
            </a>
          ))}
        </nav>
      ) : null}
      {/* The page is shared and server-rendered, so it never knows the visitor's personal link: the reply always goes to
          `/c/{slug}/rsvp` (the help, which also registers them when the celebration is open) and starts as «Busca tu enlace
          personal». `RsvpCredentialIsland` flips it to «Confirmar asistencia» when this tab holds the guest's credential; the
          token is never put in the markup. The guest arriving by the personal link goes to `/c/{slug}/rsvp/{token}` directly.
          The gifts button needs nothing: it is always `/c/{slug}/regalos`. */}
      <CelebrationRenderer theme={theme} view={view} gallery={gallery} t={t} only={only} basePath={basePath} rsvpHelpHref={celebrationPath(view.slug, "rsvp")} rsvpAdaptive mapConfigUrl={mapConfigUrl()} now={visualTestNow()} />
      {/* A quiet block after everything else (never in the dock, never a button): vendors for the guest's own celebration. No query, no fragment, no token. */}
      {providersEntry && !only ? (
        <aside className="celebration-providers" data-testid="providers-entry">
          <p>{t("directory.guestMarketplace.entryBody")}</p>
          <a href={`${marketplacePath(view.slug)}?lang=${locale}`} data-link-kind="internal">{t("directory.guestMarketplace.entry")}</a>
        </aside>
      ) : null}
      <RsvpCredentialIsland slug={view.slug} />
      {/* F7: anyone may report the page, and the own music apart (only when this page plays one that is not already hidden). */}
      <ReportInvitation slug={view.slug} locale={locale} hasOwnMusic={hasOwnMusic(view, gallery)} />
    </>
  );
}
