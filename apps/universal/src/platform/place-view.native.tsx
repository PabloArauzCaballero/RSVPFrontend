import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { mapEmbedUrl, placeSearchHref, directionsHref } from "@rsvp/celebration-theme/model";
import { radius, spacing } from "@rsvp/design-tokens";
import { useColors } from "@rsvp/ui";
import { ActionButton, useStyles } from "../host/ui";
import { useT } from "./providers";
import { copyText } from "./clipboard";
import { siteOrigin } from "./site-origin";

/**
 * A place shown in the app (the public address of a partner): the text always, and with a marked point «Ver mapa» (the map is the
 * site's own page `/mapa/incrustado?mode=view`, OpenStreetMap, loaded only when asked), «Cómo llegar» and «Copiar dirección».
 * With no point, «Cómo llegar» opens OpenStreetMap's search of the written address and says so. No link of the owner is ever followed.
 * The web view loads only the site's own page; iOS and Android were not run (see docs/progress/mapas-osm-ronda2.md).
 */

export interface PlaceViewProps {
  readonly name: string;
  readonly address?: string | undefined;
  readonly point?: { readonly lat: number; readonly lng: number } | undefined;
}

const MAP_HEIGHT = 260;
const ZOOM = 16;

export function PlaceView({ name, address, point }: PlaceViewProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const origin = siteOrigin();
  const searchHref = point ? null : placeSearchHref(name, address);
  const directions = point ? directionsHref(point) : searchHref;
  const url = point ? mapEmbedUrl(origin, { ...point, zoom: ZOOM }, "view") : null;
  const copy = async (): Promise<void> => { setCopied((await copyText([name, address].filter(Boolean).join(", "))) ? "done" : "failed"); };
  // Only the site's own map page may load in this web view.
  const onShould = (request: ShouldStartLoadRequest): boolean => url !== null && request.url.startsWith(`${origin}${new URL(url).pathname}`);

  return (
    <View style={{ gap: spacing[2] }} testID="place-view">
      {address ? <Text style={styles.body}>{address}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
        {point ? <ActionButton icon="pin" variant="secondary" label={open ? t("celebration.venues.hideMap") : t("celebration.venues.showMap")} onPress={() => setOpen((value) => !value)} testID="place-map-toggle" /> : null}
        {directions ? <ActionButton icon="arrow" variant="secondary" label={t("celebration.venues.howToGetThere")} onPress={() => { void Linking.openURL(directions); }} testID="place-directions" /> : null}
        <ActionButton icon="copy" variant="secondary" label={t("celebration.venues.copyAddress")} onPress={() => { void copy(); }} testID="place-copy" />
      </View>
      {searchHref ? <Text style={styles.muted}>{t("celebration.venues.searchNote")}</Text> : null}
      <Text accessibilityLiveRegion="polite" style={styles.muted}>{copied === "done" ? t("celebration.venues.copied") : copied === "failed" ? t("celebration.venues.copyFailed") : ""}</Text>
      {open && url ? (
        <View style={{ gap: spacing[1] }}>
          <View style={{ height: MAP_HEIGHT, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: palette.border }}>
            <WebView
              testID="place-webview" accessible accessibilityLabel={t("celebration.venues.mapOfPlace")} source={{ uri: url }} originWhitelist={[origin]}
              onShouldStartLoadWithRequest={onShould} onError={() => setFailed(true)} onHttpError={() => setFailed(true)}
              javaScriptEnabled domStorageEnabled allowFileAccess={false} allowUniversalAccessFromFileURLs={false} setSupportMultipleWindows={false}
              mixedContentMode="never" sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} allowsLinkPreview={false} nestedScrollEnabled
            />
          </View>
          {failed ? <Text role="alert" style={styles.muted}>{t("celebration.venues.mapUnavailable")}</Text> : null}
          <Text style={styles.muted}>{t("celebration.venues.mapPrivacy")}</Text>
        </View>
      ) : null}
    </View>
  );
}
