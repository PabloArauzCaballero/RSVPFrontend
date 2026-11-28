import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { LOCATION_TEXT_MAX, LocationSource, type CelebrationLocation, type MapPoint } from "@rsvp/celebration-theme/model";
import { spacing } from "@rsvp/design-tokens";
import type { MapPlace } from "@rsvp/api-client";
import { useT } from "../platform/providers";
import { LIMITS, overLimit } from "./limits";
import { MapPicker } from "./map-picker";
import { PlaceSearch } from "./place-search";
import { ActionButton, Field, Notice, useStyles } from "./ui";

/**
 * Where a place is: its name as text, and, optionally, its exact point. The host searches for it (explicit «Buscar», never while
 * typing) or marks it on a map; no link is asked for or accepted. Without a point the invitation shows only the name and address,
 * which is always enough to know where it is. The point remembers the name it was marked for, so renaming the place asks the host
 * to check it instead of leaving a stale pin silently.
 */

export interface LocationFieldProps {
  readonly name: string;
  readonly onName: (value: string) => void;
  readonly location: CelebrationLocation | null;
  readonly onLocation: (location: CelebrationLocation | null) => void;
  readonly nameLabel?: string;
  readonly nameError?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly testID?: string;
}

const short = (value: string | undefined, max: number): string | undefined => {
  const text = value?.replace(/\s+/g, " ").trim();
  return text && text.length <= max ? text : text ? text.slice(0, max).trim() : undefined;
};

export function pointedLocation(point: MapPoint, options: { readonly name: string; readonly source: typeof LocationSource.Pin | typeof LocationSource.Search | typeof LocationSource.Device; readonly previous: CelebrationLocation | null; readonly place?: MapPlace }): CelebrationLocation {
  const address = options.place ? short(options.place.label, LOCATION_TEXT_MAX.address) : options.previous?.address;
  const reference = options.previous?.reference;
  const forName = short(options.name, LOCATION_TEXT_MAX.forName);
  return {
    lat: point.lat, lng: point.lng, source: options.source,
    ...(address ? { address } : {}), ...(reference ? { reference } : {}), ...(forName ? { forName } : {}),
    ...(options.place?.osm ? { osm: options.place.osm } : {})
  };
}

export function LocationField({ name, onName, location, onLocation, nameLabel, nameError, placeholder, testID = "location" }: LocationFieldProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [picking, setPicking] = useState(false);
  const stale = Boolean(location && ((location.forName && location.forName.trim().toLowerCase() !== name.trim().toLowerCase()) || location.source === LocationSource.LegacyLink));
  const label = nameLabel ?? t("host.editor.general.venueName");
  return (
    <View style={{ gap: spacing[3] }}>
      <PlaceSearch label={label} value={name} onChange={onName} error={nameError}
        placeholder={placeholder ?? t("host.location.searchPlaceholder")} testID={`${testID}-name`} buttonTestID={`${testID}-search`}
        onPick={(place) => {
          const fits = overLimit(place.name, LIMITS.venueName) === null;
          if (fits) onName(place.name);
          onLocation(pointedLocation(place.point, { name: fits ? place.name : name, source: LocationSource.Search, previous: location, place }));
        }} />
      <View style={[styles.row, { alignItems: "center" }]}>
        <ActionButton variant="secondary" icon="pin" label={t(location ? "host.location.change" : "host.location.mark")} onPress={() => setPicking(true)} testID={`${testID}-map`} />
        {location ? <ActionButton variant="secondary" icon="close" label={t("host.location.remove")} onPress={() => onLocation(null)} testID={`${testID}-remove`} /> : null}
      </View>
      {location ? <Text role="status" style={styles.muted}>{location.address ? t("host.location.markedNear", { address: location.address }) : t("host.location.marked")}</Text> : <Text style={styles.muted}>{t("host.location.unmarked")}</Text>}
      {stale ? <Notice kind="info">{t("host.location.needsReview")}</Notice> : null}
      {location ? (
        <Field label={t("host.location.reference")} help={t("host.location.referenceHelp")} placeholder={t("host.location.referencePlaceholder")} value={location.reference ?? ""} testID={`${testID}-reference`}
          {...(overLimit(location.reference ?? "", LOCATION_TEXT_MAX.reference) !== null ? { error: t("host.limits.tooLong", { count: overLimit(location.reference ?? "", LOCATION_TEXT_MAX.reference) ?? 0, max: LOCATION_TEXT_MAX.reference }) } : {})}
          onChange={(value) => { const { reference: _drop, ...rest } = location; onLocation(value.trim() ? { ...rest, reference: value } : rest); }} />
      ) : null}
      <Text style={styles.muted}>{t("host.location.privacy")}</Text>
      {picking ? <MapPicker initial={location} query={name.trim()} onClose={() => setPicking(false)}
        onPick={(point, place) => { onLocation(pointedLocation(point, { name, source: place ? LocationSource.Search : LocationSource.Pin, previous: location, ...(place ? { place } : {}) })); setPicking(false); }} /> : null}
    </View>
  );
}
