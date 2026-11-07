import { Landing } from "../components/landing";
import { siteI18n } from "../lib/site-locale";

/** Public home for hosts: the offer, a working sample of the invitation, and the way in. */
export default async function Home() {
  const { t } = await siteI18n();
  return <Landing t={t} />;
}
