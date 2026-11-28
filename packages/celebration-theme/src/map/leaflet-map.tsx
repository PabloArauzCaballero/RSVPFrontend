"use client";

import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref, type ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMapInstance } from "leaflet";
import type { MapConfig, MapPoint } from "../location.js";

/**
 * The map every surface shares (invitation, host picker on the web, the page the native app loads in a web view): Leaflet
 * with OpenStreetMap tiles. Browser only. It loads Leaflet when it is mounted (never on the server, never before the visitor asks),
 * asks only for the tiles in sight (no prefetch, no offline copy: OSM tile policy), sends the page's origin as Referer to the tile
 * server and always shows the attribution. Without a working tile server the map stays blank and `onUnavailable` says so; the
 * text around it is what tells the place.
 */

/** Another origin receives only ours, never a path, a query or a token (some pages are `no-referrer`). */
const TILE_REFERRER_POLICY = "strict-origin-when-cross-origin";
const COPYRIGHT = "https://www.openstreetmap.org/copyright";
const FAILED_TILES = 4;
const ZOOM_PLACE = 17;
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export interface LeafletMapHandle {
  center(): MapPoint | null;
  setView(point: MapPoint, zoom?: number): void;
}

export interface LeafletMapProps {
  readonly point: MapPoint;
  /** `view`: a pin on the place, the visitor can move around. `pick`: the pin stays in the middle (drawn by the caller) and the map moves under it. */
  readonly mode: "view" | "pick";
  readonly config: MapConfig;
  readonly zoom?: number;
  /** Accessible name of the map region. */
  readonly label: string;
  readonly handle?: Ref<LeafletMapHandle>;
  /** Pick mode: the centre changed (drag, zoom, keys). */
  readonly onCenter?: (point: MapPoint) => void;
  /** No tile arrived: the tile server is down, blocked or offline. */
  readonly onUnavailable?: () => void;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function LeafletMap({ point, mode, config, zoom, label, handle, onCenter, onUnavailable, className, style }: LeafletMapProps): ReactNode {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMapInstance | null>(null);
  const callbacks = useRef({ onCenter, onUnavailable });
  callbacks.current = { onCenter, onUnavailable };

  useImperativeHandle(handle, () => ({
    center: () => { const center = map.current?.getCenter(); return center ? { lat: center.lat, lng: center.wrap().lng } : null; },
    setView: (next, level = ZOOM_PLACE) => { map.current?.setView([next.lat, next.lng], level); }
  }), []);

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((leaflet) => {
      const element = holder.current;
      if (disposed || !element) return;
      const created = leaflet.map(element, { center: [point.lat, point.lng], zoom: zoom ?? ZOOM_PLACE, maxZoom: config.maxZoom, zoomControl: true, attributionControl: true });
      let failed = 0; let loaded = false;
      const layer = leaflet.tileLayer(config.tileUrl, { maxZoom: config.maxZoom, referrerPolicy: TILE_REFERRER_POLICY, attribution: `&copy; <a href="${COPYRIGHT}" target="_blank" rel="noopener noreferrer">${escapeHtml(config.attribution.replace(/^©\s*/, ""))}</a>` });
      layer.on("tileload", () => { loaded = true; });
      layer.on("tileerror", () => { failed += 1; if (!loaded && failed >= FAILED_TILES) { failed = -Infinity; callbacks.current.onUnavailable?.(); } });
      layer.addTo(created);
      created.attributionControl.setPrefix(false);
      if (mode === "view") {
        // A drawn pin, not Leaflet's image marker: no image files to ship and it reads in both colour schemes.
        leaflet.marker([point.lat, point.lng], { keyboard: false, interactive: false, icon: leaflet.divIcon({ className: "celebration-map-pin", html: "<span></span>", iconSize: [28, 38], iconAnchor: [14, 38] }) }).addTo(created);
      } else {
        created.on("moveend", () => { const center = created.getCenter(); callbacks.current.onCenter?.({ lat: center.lat, lng: center.wrap().lng }); });
      }
      map.current = created;
      // The container has just been laid out: measure again once it has its size.
      requestAnimationFrame(() => created.invalidateSize());
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; };
    // Created once per mount: the point only says where the map starts; it never moves a map the visitor is using.
  }, []);

  return <div ref={holder} role="application" aria-label={label} className={["celebration-map", className].filter(Boolean).join(" ")} data-mode={mode} style={style} />;
}
