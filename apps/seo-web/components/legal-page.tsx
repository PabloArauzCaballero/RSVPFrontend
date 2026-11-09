import type { Metadata } from "next";
import { isSupported } from "../lib/locale-negotiation";
import { LEGAL_PATH, legalDoc, type LegalDoc, type LegalKind } from "../lib/legal-content";
import { routeMetadata } from "../lib/seo";
import { siteI18n } from "../lib/site-locale";

/** Long-form legal page. Every word comes from `lib/legal-content.ts` (es-BO and en-US), never from the JSX. */
export function LegalPage({ doc }: Readonly<{ doc: LegalDoc }>) {
  return (
    <main id="main" className="legal">
      <h1 className="legal__title">{doc.title}</h1>
      <p className="legal__intro">{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.id} id={section.id} className="legal__section" aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`}>{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.items ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </section>
      ))}
    </main>
  );
}

/** Metadata and page of one legal document, so the three routes stay one-liners. */
export function legalRoute(kind: LegalKind) {
  async function current() {
    const { locale } = await siteI18n();
    const supported = isSupported(locale) ? locale : "es-BO";
    return { supported, doc: legalDoc(kind, supported) };
  }
  async function generateMetadata(): Promise<Metadata> {
    const { supported, doc } = await current();
    return routeMetadata({ path: LEGAL_PATH[kind], locale: supported, title: doc.title, description: doc.description });
  }
  async function Page() {
    const { doc } = await current();
    return <LegalPage doc={doc} />;
  }
  return { generateMetadata, Page };
}
