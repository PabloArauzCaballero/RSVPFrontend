import { createElement, useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
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
 * On the web it is the same page in an iframe of the site's own origin (the native file uses a web view).
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
            {createElement("iframe", { "data-testid": "place-iframe", title: t("celebration.venues.mapOfPlace"), src: url, loading: "lazy", referrerPolicy: "strict-origin-when-cross-origin", sandbox: "allow-scripts allow-same-origin", onError: () => setFailed(true), style: { border: 0, width: "100%", height: "100%" } })}
          </View>
          {failed ? <Text role="alert" style={styles.muted}>{t("celebration.venues.mapUnavailable")}</Text> : null}
          <Text style={styles.muted}>{t("celebration.venues.mapPrivacy")}</Text>
        </View>
      ) : null}
    </View>
  );
}
