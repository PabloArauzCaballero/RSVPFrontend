// A reference is the only form that carries this declaration to the programs that compile this file from outside the package (seo-web, design-editor).
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./styles.d.ts" />
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Map as LeafletMap } from "leaflet";

/**
 * The map of one place with its pin, inside the invitation. Nothing is loaded until the guest taps: not the map library,
 * not its stylesheet and not a single tile, so OpenStreetMap learns nothing about a visitor who did not ask for the map.
 * Leaflet runs in the page itself (no iframe), so it also works inside the app's web view.
 */

export interface VenueMapLabels {
  readonly openMap: string;
  readonly showMap: string;
  readonly privacy: string;
  readonly loading: string;
  readonly failed: string;
  readonly retryShort: string;
  readonly retry: string;
  readonly mapLabel: string;
}

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = "&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener noreferrer\">OpenStreetMap</a>";
/** OSM's tile policy asks for a Referer, and the preview page is `no-referrer`: tiles send only our origin, never a path. */
const TILE_REFERRER_POLICY = "strict-origin-when-cross-origin";
const ZOOM_PLACE = 16;
const ZOOM_MAX = 19;
const PIN_WIDTH = 28;
const PIN_HEIGHT = 40;
/** With no tile at all by then, the map is blank: say so and offer to try again. */
const LOAD_DEADLINE_MS = 12000;

export function VenueMap({ point, labels }: { readonly point: { readonly lat: number; readonly lng: number }; readonly labels: VenueMapLabels }): ReactNode {
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);
  const holder = useRef<HTMLDivElement>(null);
  const { lat, lng } = point;

  useEffect(() => {
    if (!attempt) return undefined;
    let disposed = false;
    let loaded = false;
    let map: LeafletMap | null = null;
    const remove = (): void => { map?.remove(); map = null; };
    const fail = (): void => {
      if (disposed || loaded) return;
      // This attempt is over: a tile that arrives late must not bring back a map whose element is gone.
      disposed = true;
      setPhase("failed");
      // Not here: Leaflet is still using the map while it reports its tiles.
      window.setTimeout(remove, 0);
    };
    const timer = window.setTimeout(fail, LOAD_DEADLINE_MS);
    void Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([module]) => {
      const element = holder.current;
      if (disposed || !element) return;
      // Leaflet is CommonJS: bundlers expose it as the default export, the namespace or both.
      const leaflet = (module as unknown as { readonly default?: typeof module }).default ?? module;
      const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      // The wheel keeps scrolling the invitation; zoom stays on pinch, the +/− buttons and the keyboard.
      map = leaflet.map(element, { center: [lat, lng], zoom: ZOOM_PLACE, maxZoom: ZOOM_MAX, scrollWheelZoom: false, zoomAnimation: !still, fadeAnimation: !still, markerZoomAnimation: !still, inertia: !still });
      map.attributionControl.setPrefix(false);
      // Only the tiles in view are requested, with the browser's own cache: no prefetch and no offline copy (OSM tile policy).
      const tiles = leaflet.tileLayer(TILE_URL, { maxZoom: ZOOM_MAX, attribution: ATTRIBUTION, referrerPolicy: TILE_REFERRER_POLICY });
      tiles.on("tileload", () => { if (!disposed) { loaded = true; setPhase("ready"); } });
      // `load` fires when every tile in view has answered, well or badly.
      tiles.on("load", fail);
      tiles.addTo(map);
      leaflet.marker([lat, lng], { icon: leaflet.divIcon({ className: "celebration-map-pin", iconSize: [PIN_WIDTH, PIN_HEIGHT], iconAnchor: [PIN_WIDTH / 2, PIN_HEIGHT] }), interactive: false, keyboard: false }).addTo(map);
      // The button that was pressed is gone: focus moves to the map, which is moved with the arrow keys.
      element.focus({ preventScroll: true });
    }).catch(fail);
    return () => { disposed = true; window.clearTimeout(timer); remove(); };
  }, [attempt, lat, lng]);

  const start = (): void => { setPhase("loading"); setAttempt((value) => value + 1); };

  if (phase === "idle" || phase === "failed") {
    return (
      <div className="celebration-map" data-phase={phase}>
        {phase === "failed" ? <p role="alert" className="celebration-note">{labels.failed}</p> : null}
        <button type="button" className="celebration-map-open" onClick={start} aria-label={phase === "failed" ? labels.retry : labels.showMap}>{phase === "failed" ? labels.retryShort : labels.openMap}</button>
        <p className="celebration-note">{labels.privacy}</p>
      </div>
    );
  }
  return (
    <div className="celebration-map" data-phase={phase}>
      {/* A new element for each attempt: Leaflet cannot be mounted twice on the same one. */}
      <div key={attempt} ref={holder} className="celebration-map-canvas" role="region" aria-label={labels.mapLabel} tabIndex={0} />
      {phase === "loading" ? <p role="status" className="celebration-note">{labels.loading}</p> : null}
    </div>
  );
}
