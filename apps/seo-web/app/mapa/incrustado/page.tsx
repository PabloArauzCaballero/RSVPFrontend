import type { Metadata } from "next";
import { embedModeFromQuery, startFromQuery } from "@rsvp/celebration-theme";
import { MapEmbed } from "../../../components/map-embed";
import { siteI18n } from "../../../lib/site-locale";

/** The map the native host editor loads in a web view to mark the exact place. Not a page for anyone else: never indexed. */
export const metadata: Metadata = { title: "DOne", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EmbeddedMapPage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const one = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);
  const start = startFromQuery({ lat: one(query["lat"]), lng: one(query["lng"]), z: one(query["z"]) });
  const { t } = await siteI18n();
  return (
    <>
      <span hidden data-quiet-chrome="" />
      <MapEmbed start={{ lat: start.lat, lng: start.lng }} zoom={start.zoom} mode={embedModeFromQuery(one(query["mode"]))} label={t(embedModeFromQuery(one(query["mode"])) === "view" ? "celebration.venues.mapOfPlace" : "host.location.mapLabel")} />
    </>
  );
}
