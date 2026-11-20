import { useEffect, useRef, useState } from "react";
import { Link } from "expo-router";
import { Text, View, type TextInput } from "react-native";
import type { MapPlace } from "@rsvp/api-client";
import { usePlaceSearch } from "@rsvp/query-hooks";
import { radius, spacing } from "@rsvp/design-tokens";
import { NavIcon, PressFeedback, useColors } from "@rsvp/ui";
import { useLocale, useT } from "../platform/providers";
import { ActionButton, Field, useStyles } from "./ui";

interface PlaceSearchProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onPick: (place: MapPlace) => void;
  readonly onFirstResult?: (place: MapPlace) => void;
  readonly error?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly testID: string;
  readonly buttonTestID: string;
}

/** Shared by the inline venue field and the map. Typing only edits the query. */
export function PlaceSearch({ label, value, onChange, onPick, onFirstResult, error, placeholder, testID, buttonTestID }: PlaceSearchProps) {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const input = useRef<TextInput>(null);
  const [submitted, setSubmitted] = useState("");
  const wanted = value.trim();
  const query = submitted === wanted ? submitted : "";
  const { data: places, isFetching, isError, refetch } = usePlaceSearch(query, locale);

  useEffect(() => {
    const first = places?.[0];
    if (query && first) onFirstResult?.(first);
  }, [query, places, onFirstResult]);

  const search = (): void => {
    if (!wanted || isFetching) return;
    if (query === wanted) { if (isError) void refetch(); return; }
    setSubmitted(wanted);
  };
  const choose = (place: MapPlace): void => {
    onPick(place);
    if (!onFirstResult) {
      setSubmitted("");
      input.current?.focus();
    }
  };

  return (
    <View style={{ gap: spacing[2] }}>
      <Field label={label} value={value} onChange={(text) => { setSubmitted(""); onChange(text); }} inputRef={input}
        onSubmit={search} testID={testID} {...(placeholder ? { placeholder } : {})} {...(error ? { error } : {})}
        trailing={<ActionButton variant="secondary" icon="search" label={t("host.location.searchButton")} disabled={!wanted || isFetching} onPress={search} testID={buttonTestID} />} />
      {query && isFetching ? <Text role="status" style={styles.muted}>{t("host.location.searching")}</Text> : null}
      {query && isError ? <Text role="alert" style={styles.muted}>{t("host.location.searchError")}</Text> : null}
      {query && !isFetching && places?.length === 0 ? <Text role="status" style={styles.muted}>{t("host.location.noResults")}</Text> : null}
      {query && places?.length ? (
        <View style={{ gap: spacing[1] }}>
          <Text role="status" style={styles.muted}>{t("host.location.resultsCount", { count: places.length })}</Text>
          <View role="list" aria-label={t("host.location.results")} style={{ borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, backgroundColor: palette.surface }}>
            {places.map((place, index) => {
              const address = place.label.startsWith(`${place.name}, `) ? place.label.slice(place.name.length + 2) : place.label;
              return <View role="listitem" key={place.id} style={index > 0 ? { borderTopWidth: 1, borderColor: palette.border } : undefined}>
                <PressFeedback accessibilityLabel={place.label} hoverTint onPress={() => choose(place)} testID={`${testID}-result-${index}`}
                  style={{ borderRadius: radius.md, paddingVertical: spacing[2], paddingHorizontal: spacing[3] }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                    <NavIcon name="pin" size={18} color={palette.textMuted} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.body, { fontWeight: "600" }]}>{place.name}</Text>
                      {address !== place.name ? <Text style={styles.muted}>{address}</Text> : null}
                    </View>
                  </View>
                </PressFeedback>
              </View>;
            })}
          </View>
          <Link href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={[styles.muted, { alignSelf: "flex-end", textDecorationLine: "underline" }]}>{t("host.location.attribution")}</Link>
        </View>
      ) : null}
    </View>
  );
}
