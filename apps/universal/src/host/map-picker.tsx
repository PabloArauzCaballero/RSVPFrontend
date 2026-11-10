import { createElement, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, ScrollView, Text, View, useWindowDimensions } from "react-native";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { MapPoint } from "@rsvp/celebration-theme";
import { Button, PressFeedback, useColors } from "@rsvp/ui";
import { colors, radius, spacing } from "@rsvp/design-tokens";
import { useLocale, useT } from "../platform/providers";
import { ActionButton, Field, Notice, useStyles } from "./ui";

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

interface Place { readonly id: string; readonly label: string; readonly point: MapPoint }

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const SEARCH = "https://nominatim.openstreetmap.org/search";
const ATTRIBUTION = "&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener noreferrer\">OpenStreetMap</a>";
/** Nothing marked yet: Bolivia whole, so the first move is a search or "my location". */
const COUNTRY: MapPoint = { lat: -16.7, lng: -64.9 };
const ZOOM_COUNTRY = 5;
const ZOOM_PLACE = 17;
const ZOOM_MAX = 19;
const RESULTS = 5;
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
  const locale = useLocale();
  const { height } = useWindowDimensions();
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const [text, setText] = useState(query);
  const [places, setPlaces] = useState<readonly Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<"search" | "location" | null>(null);

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((leaflet) => {
      const element = holder.current;
      if (disposed || !element) return;
      const created = leaflet.map(element, { center: [(initial ?? COUNTRY).lat, (initial ?? COUNTRY).lng], zoom: initial ? ZOOM_PLACE : ZOOM_COUNTRY, maxZoom: ZOOM_MAX });
      leaflet.tileLayer(TILES, { maxZoom: ZOOM_MAX, attribution: ATTRIBUTION }).addTo(created);
      created.attributionControl.setPrefix(false);
      map.current = created;
      // The dialog has just been laid out: measure again once it has its size.
      requestAnimationFrame(() => created.invalidateSize());
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; };
    // The map is created once per opening; `initial` only says where it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const show = (point: MapPoint): void => { map.current?.setView([point.lat, point.lng], ZOOM_PLACE); };
  const search = (): void => {
    const wanted = text.trim();
    if (!wanted || busy) return;
    setBusy(true); setProblem(null);
    const url = `${SEARCH}?format=jsonv2&limit=${RESULTS}&accept-language=${encodeURIComponent(locale)}&q=${encodeURIComponent(wanted)}`;
    fetch(url, { headers: { Accept: "application/json" } })
      .then((answer) => (answer.ok ? answer.json() : Promise.reject(new Error(String(answer.status)))))
      .then((found: unknown) => {
        const list = (Array.isArray(found) ? found : []).flatMap((item: unknown): Place[] => {
          const row = item as { place_id?: unknown; display_name?: unknown; lat?: unknown; lon?: unknown };
          const lat = Number(row.lat);
          const lng = Number(row.lon);
          return typeof row.display_name === "string" && Number.isFinite(lat) && Number.isFinite(lng) ? [{ id: String(row.place_id), label: row.display_name, point: { lat, lng } }] : [];
        });
        setPlaces(list);
        const [first] = list;
        if (first) show(first.point);
      })
      .catch(() => setProblem("search"))
      .finally(() => setBusy(false));
  };
  const locate = (): void => {
    if (!("geolocation" in navigator)) { setProblem("location"); return; }
    setLocating(true); setProblem(null);
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocating(false); show({ lat: position.coords.latitude, lng: position.coords.longitude }); },
      () => { setLocating(false); setProblem("location"); },
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
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal role="dialog" aria-label={t("host.location.pickerTitle")} testID="map-picker" style={[styles.dialog, { maxWidth: DIALOG_WIDTH, maxHeight: "96%", padding: spacing[4], gap: spacing[3] }]}>
          <Text accessibilityRole="header" style={styles.subtitle}>{t("host.location.pickerTitle")}</Text>
          {/* Search, results and map scroll together on a short screen; the two closing actions stay in sight below. */}
          <ScrollView tabIndex={0} aria-label={t("host.location.pickerTitle")} style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing[3] }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", gap: spacing[2], alignItems: "flex-end" }}>
            <View style={{ flex: 1, minWidth: 0 }}><Field label={t("host.location.search")} placeholder={t("host.location.searchPlaceholder")} value={text} onChange={setText} onSubmit={search} testID="map-search" /></View>
            <ActionButton variant="secondary" icon="search" label={t("host.location.searchButton")} busy={busy} onPress={search} testID="map-search-go" />
          </View>
          {places && !places.length ? <Text role="status" style={styles.muted}>{t("host.location.noResults")}</Text> : null}
          {places && places.length > 1 ? (
            <View role="list" aria-label={t("host.location.results")} style={{ gap: spacing[1] }}>
              {places.slice(0, 3).map((place) => (
                <View role="listitem" key={place.id}>
                  <PressFeedback accessibilityRole="button" accessibilityLabel={place.label} hoverTint onPress={() => show(place.point)} style={{ borderRadius: radius.md, paddingHorizontal: spacing[2], paddingVertical: spacing[1] }}>
                    <Text numberOfLines={1} style={styles.muted}>{place.label}</Text>
                  </PressFeedback>
                </View>
              ))}
            </View>
          ) : null}
          {problem ? <Notice kind="error">{t(problem === "search" ? "host.location.searchError" : "host.location.locationError")}</Notice> : null}
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
