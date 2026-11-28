"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_MAP_CONFIG, LeafletMap, MAP_BRIDGE, parseNativeToMap, readMapConfig, type LeafletMapHandle, type MapConfig, type MapPoint } from "@rsvp/celebration-theme";
import { guestApiBase } from "../lib/guest-client";

/**
 * The map the native host editor loads in a web view (the app has no map library of its own). The pin stays in the middle and
 * the map moves under it; every move is reported to the app, which keeps the latest centre and saves it when the host confirms.
 * The search is not here: the app runs it with the host's session and sends `center` to bring the map near. Nothing personal is
 * in this page's address and no token ever enters it.
 */

type Bridge = { readonly postMessage: (message: string) => void };
const bridge = (): Bridge | undefined => (window as unknown as { ReactNativeWebView?: Bridge }).ReactNativeWebView;
const send = (message: Record<string, unknown>): void => bridge()?.postMessage(JSON.stringify({ bridge: MAP_BRIDGE, ...message }));

export function MapEmbed({ start, zoom, label }: { readonly start: MapPoint; readonly zoom: number; readonly label: string }) {
  const [config, setConfig] = useState<MapConfig | null>(null);
  const map = useRef<LeafletMapHandle>(null);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch(`${guestApiBase().replace(/\/$/, "")}/providers/geo/map-config`, { signal: controller.signal, referrerPolicy: "no-referrer" })
      .then((response) => (response.ok ? response.json() : null)).then((body) => readMapConfig(body), () => DEFAULT_MAP_CONFIG)
      .then((loaded) => { if (current) setConfig(loaded); }).finally(() => clearTimeout(timer));
    return () => { current = false; controller.abort(); };
  }, []);

  useEffect(() => {
    // iOS delivers web view messages to `window`, Android to `document`.
    const onMessage = (event: Event): void => {
      const message = parseNativeToMap((event as MessageEvent<unknown>).data);
      if (message) map.current?.setView({ lat: message.lat, lng: message.lng }, message.zoom);
    };
    window.addEventListener("message", onMessage); document.addEventListener("message", onMessage);
    return () => { window.removeEventListener("message", onMessage); document.removeEventListener("message", onMessage); };
  }, []);

  useEffect(() => { if (config) send({ type: "ready" }); }, [config]);

  return (
    <div className="map-embed" data-testid="map-embed">
      {config ? <LeafletMap handle={map} point={start} zoom={zoom} mode="pick" config={config} label={label} onCenter={(point) => send({ type: "moved", lat: point.lat, lng: point.lng })} onUnavailable={() => send({ type: "unavailable" })} className="map-embed-canvas" /> : null}
      {/* The pin never moves: its tip marks the middle of the map, which is the point that will be saved. */}
      <span className="map-embed-pin" aria-hidden="true" />
    </div>
  );
}
