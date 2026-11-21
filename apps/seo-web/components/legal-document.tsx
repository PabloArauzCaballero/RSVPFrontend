import type { Metadata } from "next";
import { LEGAL_DOCUMENTS, legalBlocks, type LegalDocument, type Translate } from "@rsvp/i18n/server";
import { routeMetadata } from "../lib/seo";
import { isSupported } from "../lib/locale-negotiation";
import type { AppLocale } from "@rsvp/i18n/server";

/** B6 · A draft (version ending in "-borrador") is published so it can be linked and reviewed, but not indexed until legal review (P6). */
export const isDraftVersion = (version: string): boolean => version.endsWith("-borrador");

export function legalMetadata(document: LegalDocument, t: Translate, locale: AppLocale): Metadata {
  const base = routeMetadata({ path: LEGAL_DOCUMENTS[document].path, locale: isSupported(locale) ? locale : "es-BO", title: t(`legal.${document}.title`), description: t(`legal.${document}.description`) });
  return isDraftVersion(t("legal.version")) ? { ...base, robots: { index: false, follow: true } } : base;
}

/** The privacy policy or the terms: draft banner, version, an index of sections and each section with its paragraphs and lists. */
export function LegalDocumentPage({ document, t }: Readonly<{ document: LegalDocument; t: Translate }>) {
  const { sections } = LEGAL_DOCUMENTS[document];
  const version = t("legal.version");
  const other: LegalDocument = document === "privacy" ? "terms" : "privacy";
  return (
    <main className="legal-page">
      <article className="legal-doc" aria-labelledby="legal-title">
        {isDraftVersion(version) ? <p className="legal-draft" role="note">{t("legal.draftBanner")}</p> : null}
        <h1 id="legal-title">{t(`legal.${document}.title`)}</h1>
        <p className="legal-version">{t("legal.updated", { version })}</p>
        <p className="legal-lead">{t(`legal.${document}.lead`)}</p>
        <nav className="legal-toc" aria-label={t("legal.contents")}>
          <ol>{sections.map((section) => <li key={section}><a href={`#${section}`}>{t(`legal.${document}.sections.${section}.heading`)}</a></li>)}</ol>
        </nav>
        {sections.map((section) => (
          <section key={section} id={section} aria-labelledby={`${section}-heading`}>
            <h2 id={`${section}-heading`}>{t(`legal.${document}.sections.${section}.heading`)}</h2>
            {legalBlocks(t(`legal.${document}.sections.${section}.body`)).map((block, index) => block.kind === "paragraph"
              ? <p key={index}>{block.text}</p>
              : <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>)}
          </section>
        ))}
        <p className="legal-other"><a href={LEGAL_DOCUMENTS[other].path}>{t(`legal.links.${other}`)}</a></p>
      </article>
    </main>
  );
}
