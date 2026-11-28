"use client";

import { lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { DEFAULT_MAP_CONFIG, directionsHref, openMapHref, placeSearchHref, readMapConfig, type CelebrationLocation, type MapConfig } from "../location.js";

/**
 * A place on the invitation: its name and address as text (always enough to know where it is), then, when the host marked a
 * point, «Ver mapa» (the map loads only when the guest asks, so nothing is requested from OpenStreetMap before), «Cómo llegar»
 * (OpenStreetMap's directions, built from the coordinates) and «Copiar dirección». No link of the host is ever followed.
 * Text arrives already translated: a function cannot cross from a server component to this one.
 */

const LazyMap = lazy(() => import("./leaflet-map.js").then((module) => ({ default: module.LeafletMap })));
const CONFIG_DEADLINE_MS = 4000;
const COPIED_MS = 3000;

export interface LocationLabels {
  readonly showMap: string; readonly hideMap: string; readonly directions: string; readonly copy: string; readonly copied: string; readonly copyFailed: string;
  /** Accessible name of the map. */ readonly mapLabel: string;
  /** "Al abrir el mapa, tu navegador se conecta a OpenStreetMap." */ readonly privacy: string;
  readonly loading: string; readonly unavailable: string; readonly openInOsm: string; readonly unverified: string;
  /** Shown beside «Cómo llegar» when it only searches the written address (no point was marked). */ readonly searchNote: string;
}

export interface LocationViewProps {
  readonly name: string;
  /** Address and reference lines, as text. */
  readonly lines: readonly string[];
  readonly location?: CelebrationLocation | undefined;
  readonly labels: LocationLabels;
  /** `GET /providers/geo/map-config` of the backend: tiles and attribution can change without publishing the apps. Absent: OpenStreetMap's own server. */
  readonly mapConfigUrl?: string | undefined;
}

async function loadConfig(url: string | undefined): Promise<MapConfig> {
  if (!url) return DEFAULT_MAP_CONFIG;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG_DEADLINE_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    return response.ok ? readMapConfig(await response.json()) : DEFAULT_MAP_CONFIG;
  } catch { return DEFAULT_MAP_CONFIG; } finally { clearTimeout(timer); }
}

export function LocationView({ name, lines, location, labels, mapConfigUrl }: LocationViewProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const noteId = useId();
  // An invitation made before the pin existed: «Cómo llegar» searches the written address in OpenStreetMap.
  const searchHref = location ? null : placeSearchHref(name, lines[0]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open || config) return undefined;
    let current = true;
    void loadConfig(mapConfigUrl).then((loaded) => { if (current) setConfig(loaded); });
    return () => { current = false; };
  }, [open, config, mapConfigUrl]);

  const copyAddress = (): void => {
    const text = [name, ...lines].filter(Boolean).join(", ");
    const done = (result: "done" | "failed"): void => { setCopy(result); clearTimeout(timer.current); timer.current = setTimeout(() => setCopy("idle"), COPIED_MS); };
    if (!navigator.clipboard?.writeText) { done("failed"); return; }
    navigator.clipboard.writeText(text).then(() => done("done"), () => done("failed"));
  };

  return (
    <div className="celebration-location" data-has-point={location ? "true" : "false"}>
      {lines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
      {location?.source === "legacy-link" ? <p className="celebration-note">{labels.unverified}</p> : null}
      {location ? (
        <div className="celebration-location-actions">
          <button type="button" className="celebration-location-button" aria-expanded={open} aria-controls={`${noteId}-map`} onClick={() => setOpen((value) => !value)}>{open ? labels.hideMap : labels.showMap}</button>
          <a href={directionsHref(location)} target="_blank" rel="noopener noreferrer" data-link-kind="navigation">{labels.directions}</a>
          <button type="button" className="celebration-location-button" onClick={copyAddress}>{labels.copy}</button>
        </div>
      ) : (
        <div className="celebration-location-actions">
          {searchHref ? <a href={searchHref} target="_blank" rel="noopener noreferrer" data-link-kind="navigation" data-directions="search">{labels.directions}</a> : null}
          <button type="button" className="celebration-location-button" onClick={copyAddress}>{labels.copy}</button>
        </div>
      )}
      {searchHref ? <p className="celebration-note">{labels.searchNote}</p> : null}
      <p aria-live="polite" className="celebration-note">{copy === "done" ? labels.copied : copy === "failed" ? labels.copyFailed : ""}</p>
      {location && open ? (
        <div id={`${noteId}-map`} className="celebration-location-map">
          {config ? (
            <Suspense fallback={<p role="status" className="celebration-note">{labels.loading}</p>}>
              <LazyMap point={location} mode="view" config={config} label={labels.mapLabel} onUnavailable={() => setUnavailable(true)} />
            </Suspense>
          ) : <p role="status" className="celebration-note">{labels.loading}</p>}
          {unavailable ? <p role="alert" className="celebration-note">{labels.unavailable} <a href={openMapHref(location)} target="_blank" rel="noopener noreferrer">{labels.openInOsm}</a></p> : null}
          <p className="celebration-note">{labels.privacy}</p>
        </div>
      ) : null}
    </div>
  );
}
