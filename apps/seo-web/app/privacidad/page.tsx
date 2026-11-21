import type { Metadata } from "next";
import { siteI18n } from "../../lib/site-locale";
import { LegalDocumentPage, legalMetadata } from "../../components/legal-document";

/** B6 · privacy (draft pending legal review, P6). Linked from the footer, the sign-up and the RSVP form. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await siteI18n();
  return legalMetadata("privacy", t, locale);
}

export default async function Page() {
  const { t } = await siteI18n();
  return <LegalDocumentPage document="privacy" t={t} />;
}
