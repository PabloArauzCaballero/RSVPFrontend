import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, ScrollView, Text, View, useWindowDimensions } from "react-native";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { MapPlace } from "@rsvp/api-client";
import type { MapPoint } from "@rsvp/celebration-theme/model";
import { Button, overlayAnimation, useColors } from "@rsvp/ui";
import { colors, radius, spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { PlaceSearch } from "./place-search";
import { ActionButton, Notice, useStyles } from "./ui";

/**
 * Marks the exact place of the celebration on a map. The pin stays in the middle and the host moves the map under it
 * (drag, pinch, the +/− buttons or the arrow keys), so it works the same with a thumb, a mouse and a keyboard. A search
 * by name or address and "my location" bring the map near; the host finishes by eye. Map and search are OpenStreetMap's.
 */

export const MAP_PICKER_AVAILABLE = true;

export interface MapPickerProps {
  /** Where the map opens: the place already marked, if any. */
  readonly initial: MapPoint | null;
  /** Text the search starts with: the venue as the host wrote it. */
  readonly query: string;
  readonly onPick: (point: MapPoint) => void;
  readonly onClose: () => void;
}

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = "&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener noreferrer\">OpenStreetMap</a>";
/** Nothing marked yet: Bolivia whole, so the first move is a search or "my location". */
const COUNTRY: MapPoint = { lat: -16.7, lng: -64.9 };
const ZOOM_COUNTRY = 5;
const ZOOM_PLACE = 17;
const ZOOM_MAX = 19;
const DIALOG_WIDTH = 720;
const MAP_MAX = 440;
const MAP_MIN = 220;
const CHROME = 420;
const PIN_HEAD = 26;
const PIN_STEM = 14;
const PIN_DOT = 8;
const LOCATE_TIMEOUT = 10_000;

export function MapPicker({ initial, query, onPick, onClose }: MapPickerProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const { height } = useWindowDimensions();
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const startPoint = useRef(initial);
  const [text, setText] = useState(query);
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((leaflet) => {
      const element = holder.current;
      if (disposed || !element) return;
      const point = startPoint.current ?? COUNTRY;
      const created = leaflet.map(element, { center: [point.lat, point.lng], zoom: startPoint.current ? ZOOM_PLACE : ZOOM_COUNTRY, maxZoom: ZOOM_MAX });
      leaflet.tileLayer(TILES, { maxZoom: ZOOM_MAX, attribution: ATTRIBUTION }).addTo(created);
      created.attributionControl.setPrefix(false);
      map.current = created;
      // The dialog has just been laid out: measure again once it has its size.
      requestAnimationFrame(() => created.invalidateSize());
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; };
    // Created once per opening on purpose: `initial` only says where the map starts, it never moves it afterwards.
  }, []);

  const show = useCallback((point: MapPoint): void => {
    startPoint.current = point;
    map.current?.setView([point.lat, point.lng], ZOOM_PLACE);
  }, []);
  const showPlace = useCallback((place: MapPlace): void => { setLocateFailed(false); show(place.point); }, [show]);
  const locate = (): void => {
    if (!("geolocation" in navigator)) { setLocateFailed(true); return; }
    setLocating(true); setLocateFailed(false);
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocating(false); show({ lat: position.coords.latitude, lng: position.coords.longitude }); },
      () => { setLocating(false); setLocateFailed(true); },
      { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT }
    );
  };
  const confirm = (): void => {
    const center = map.current?.getCenter();
    if (!center) return;
    onPick({ lat: center.lat, lng: center.wrap().lng });
  };
  const mapHeight = Math.max(MAP_MIN, Math.min(MAP_MAX, height - CHROME));

  return (
    <Modal visible transparent animationType={overlayAnimation("fade")} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal role="dialog" aria-modal aria-label={t("host.location.pickerTitle")} testID="map-picker" style={[styles.dialog, { maxWidth: DIALOG_WIDTH, maxHeight: "96%", padding: spacing[4], gap: spacing[3] }]}>
          <Text accessibilityRole="header" style={styles.subtitle}>{t("host.location.pickerTitle")}</Text>
          {/* Search, results and map scroll together on a short screen; the two closing actions stay in sight below. */}
          <ScrollView tabIndex={0} aria-label={t("host.location.pickerTitle")} style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing[3] }} keyboardShouldPersistTaps="handled">
          <PlaceSearch label={t("host.location.search")} placeholder={t("host.location.searchPlaceholder")} value={text} onChange={setText}
            onPick={showPlace} onFirstResult={showPlace} testID="map-search" buttonTestID="map-search-go" />
          {locateFailed ? <Notice kind="error">{t("host.location.locationError")}</Notice> : null}
          <View style={{ height: mapHeight, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: palette.border, isolation: "isolate" } as object}>
            {createElement("div", { ref: holder, role: "application", "aria-label": t("host.location.mapLabel"), "data-testid": "map-canvas", style: { width: "100%", height: "100%", zIndex: 0 } })}
            {/* The pin never moves: its tip marks the middle of the map, which is the point that will be saved. */}
            <View aria-hidden pointerEvents="none" style={{ position: "absolute", left: "50%", top: "50%", width: PIN_HEAD, marginLeft: -PIN_HEAD / 2, marginTop: -(PIN_HEAD + PIN_STEM), alignItems: "center", zIndex: 1000 }}>
              <View style={{ width: PIN_HEAD, height: PIN_HEAD, borderRadius: radius.full, backgroundColor: MAP_PIN, borderWidth: 2, borderColor: MAP_PIN_EDGE, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: PIN_DOT, height: PIN_DOT, borderRadius: radius.full, backgroundColor: MAP_PIN_EDGE }} />
              </View>
              <View style={{ width: 3, height: PIN_STEM, backgroundColor: MAP_PIN, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
            </View>
          </View>
          <Text style={styles.muted}>{t("host.location.hint")}</Text>
          <View style={{ alignItems: "flex-start" }}><ActionButton variant="secondary" icon="pin" label={t("host.location.myLocation")} busy={locating} onPress={locate} testID="map-locate" /></View>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <View style={{ flex: 1 }}><Button variant="secondary" icon="close" block onPress={onClose} testID="map-cancel">{t("host.common.cancel")}</Button></View>
            <View style={{ flex: 1 }}><Button icon="check" block onPress={confirm} testID="map-use">{t("host.location.use")}</Button></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** The pin sits on map tiles, not on the app's surfaces: one dark body with a light edge reads on streets and on parks, in both schemes. */
const MAP_PIN = colors.light.text;
const MAP_PIN_EDGE = colors.light.surface;
