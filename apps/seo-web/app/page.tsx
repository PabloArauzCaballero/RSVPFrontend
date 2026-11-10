import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { Landing } from "../components/landing";

export const revalidate = 3600;

/** Public home for hosts: the offer, a working sample of the invitation, and the way in. */
export default function Home() {
  return <Landing t={createTranslator(defaultLocale)} />;
}
