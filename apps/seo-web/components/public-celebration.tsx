import { CelebrationRenderer, fontStylesheet, themeFromTemplate, type SectionId } from "@rsvp/celebration-theme";
import { createTranslator, supportedLocales } from "@rsvp/i18n/server";
import type { PublicPage } from "../lib/celebration";
import { visualTestNow } from "../lib/dev-surfaces";
import { eventJsonLd, jsonLdScript } from "../lib/json-ld";
import { uiLocale } from "../lib/locale";
import { celebrationPath, siteUrl } from "../lib/metadata";
import { RsvpCredentialIsland } from "./rsvp-credential-island";

/** The public celebration (A1) or one of its sections (A2–A8), server-rendered with its theme. */
export function PublicCelebration({ page, only }: { readonly page: PublicPage; readonly only?: SectionId }) {
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
      <CelebrationRenderer theme={theme} view={view} gallery={gallery} t={t} only={only} basePath={basePath} now={visualTestNow()} rsvpHelpHref={celebrationPath(view.slug, "rsvp")} rsvpAdaptive />
      <RsvpCredentialIsland slug={view.slug} />
    </>
  );
}
