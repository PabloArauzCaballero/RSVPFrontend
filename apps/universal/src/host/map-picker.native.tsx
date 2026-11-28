import { useCallback, useRef, useState, type ReactNode } from "react";
import { Modal, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import type { MapPlace } from "@rsvp/api-client";
import { MAP_BRIDGE, mapEmbedUrl, parseMapToNative, startFromQuery } from "@rsvp/celebration-theme/model";
import { Button, overlayAnimation, useColors } from "@rsvp/ui";
import { radius, spacing } from "@rsvp/design-tokens";
import { siteOrigin } from "../platform/site-origin";
import { useT } from "../platform/providers";
import type { MapPickerProps } from "./map-picker";
import { PlaceSearch } from "./place-search";
import { Notice, useStyles } from "./ui";

/**
 * iOS and Android: the map is the site's own page (`/mapa/incrustado`, Leaflet with OpenStreetMap) in a web view, because the app has
 * no map library. The pin stays in the middle and the host moves the map under it. The search runs here, with the host's session,
 * and only tells the page where to centre: the session token never enters the web view. The page reports its centre as it moves;
 * «Listo» saves the latest one. The web view loads only the site's origin; anything else is refused.
 */

export const MAP_PICKER_AVAILABLE = true;

const DIALOG_WIDTH = 720;
const MAP_MAX = 420;
const MAP_MIN = 240;
const CHROME = 380;
const ZOOM_PLACE = 17;
const SAME_PLACE = 0.001;

export function MapPicker({ initial, query, onPick, onClose }: MapPickerProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const { height } = useWindowDimensions();
  const origin = siteOrigin();
  const web = useRef<WebView>(null);
  const centre = useRef<{ lat: number; lng: number } | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const shownPlace = useRef<MapPlace | null>(null);
  const [text, setText] = useState(query);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  /** The host has a point to save: the place already marked, a search result or a move of the map. */
  const [hasPoint, setHasPoint] = useState(initial !== null);
  const start = startFromQuery(initial ? { lat: String(initial.lat), lng: String(initial.lng) } : {});
  const url = useRef(mapEmbedUrl(origin, start)).current;

  const show = useCallback((place: MapPlace): void => {
    shownPlace.current = place;
    centre.current = { ...place.point };
    setHasPoint(true);
    web.current?.postMessage(JSON.stringify({ bridge: MAP_BRIDGE, type: "center", lat: place.point.lat, lng: place.point.lng, zoom: ZOOM_PLACE }));
  }, []);
  const onMessage = useCallback((event: WebViewMessageEvent): void => {
    const message = parseMapToNative(event.nativeEvent.data);
    if (!message) return;
    if (message.type === "ready") setPhase("ready");
    else if (message.type === "unavailable") setPhase("failed");
    else { centre.current = { lat: message.lat, lng: message.lng }; setHasPoint(true); }
  }, []);
  // Only the site's own page may load in this web view: another address is never opened here.
  const onShould = useCallback((request: ShouldStartLoadRequest): boolean => request.url === url || request.url.startsWith(`${origin}${new URL(url).pathname}`), [origin, url]);
  const confirm = (): void => {
    const point = centre.current;
    if (!point) return;
    const place = shownPlace.current;
    const onPlace = place !== null && Math.abs(place.point.lat - point.lat) <= SAME_PLACE && Math.abs(place.point.lng - point.lng) <= SAME_PLACE;
    onPick(point, ...(onPlace ? [place] : []));
  };
  const mapHeight = Math.max(MAP_MIN, Math.min(MAP_MAX, height - CHROME));

  return (
    <Modal visible transparent animationType={overlayAnimation("fade")} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal role="dialog" aria-modal aria-label={t("host.location.pickerTitle")} testID="map-picker" style={[styles.dialog, { maxWidth: DIALOG_WIDTH, maxHeight: "96%", padding: spacing[4], gap: spacing[3] }]}>
          <Text accessibilityRole="header" style={styles.subtitle}>{t("host.location.pickerTitle")}</Text>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing[3] }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            <PlaceSearch label={t("host.location.search")} placeholder={t("host.location.searchPlaceholder")} value={text} onChange={setText}
              onPick={show} onFirstResult={show} testID="map-search" buttonTestID="map-search-go" />
            {phase === "failed" ? <Notice kind="error">{t("host.location.mapUnavailable")}</Notice> : null}
            <View style={{ height: mapHeight, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: palette.border }}>
              <WebView
                ref={web} testID="map-webview" accessible accessibilityLabel={t("host.location.mapLabel")} source={{ uri: url }} originWhitelist={[origin]}
                onShouldStartLoadWithRequest={onShould} onMessage={onMessage} onError={() => setPhase("failed")} onHttpError={() => setPhase("failed")}
                javaScriptEnabled domStorageEnabled allowFileAccess={false} allowUniversalAccessFromFileURLs={false} setSupportMultipleWindows={false}
                mixedContentMode="never" sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} allowsLinkPreview={false} nestedScrollEnabled
              />
            </View>
            <Text style={styles.muted}>{t("host.location.hint")}</Text>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <View style={{ flex: 1 }}><Button variant="secondary" icon="close" block onPress={onClose} testID="map-cancel">{t("host.location.cancel")}</Button></View>
            <View style={{ flex: 1 }}><Button icon="check" block state={hasPoint ? "default" : "disabled"} onPress={confirm} testID="map-use">{t("host.location.use")}</Button></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
