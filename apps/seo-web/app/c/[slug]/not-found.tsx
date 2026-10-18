import { headers } from "next/headers";
import { createTranslator, resolveLocale } from "@rsvp/i18n/server";

/** A21 · Not published, archived or mistyped: the same answer for all three, revealing nothing. */
export default async function CelebrationNotFound() {
  const accept = (await headers()).get("accept-language") ?? "";
  const t = createTranslator(resolveLocale(null, accept.split(",").map((part) => part.split(";")[0]?.trim() ?? "")));
  return (
    <main className="celebration-missing">
      <h1>{t("celebration.notFound.title")}</h1>
      <p>{t("celebration.notFound.body")}</p>
      <a href="/">{t("celebration.notFound.home")}</a>
    </main>
  );
}
