import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import type { ProviderGeoCity } from "@rsvp/query-hooks";
import { useColors } from "@rsvp/ui";
import { ToggleChip, useStyles } from "../host/ui";
import { RowsSkeleton } from "./parts";

/**
 * Coverage as the catalogue's cities, by name (GET /providers/geo): no slugs to type, nothing the server will reject as unknown
 * (L23). Shared by the service offer form and the product sheet's delivery step.
 */
export function CoveragePicker({ cities, value, onChange, label, help, error, disabled = false }: {
  readonly cities: readonly ProviderGeoCity[] | undefined; readonly value: readonly string[]; readonly onChange: (next: readonly string[]) => void;
  readonly label: string; readonly help: string; readonly error?: string | undefined; readonly disabled?: boolean;
}): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const toggle = (slug: string): void => onChange(value.includes(slug) ? value.filter((zone) => zone !== slug) : [...value, slug]);
  return (
    <View role="group" aria-label={label} style={{ gap: spacing[2] }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.muted}>{help}</Text>
      {cities ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {cities.map((city) => <ToggleChip key={city.slug} label={city.name} on={value.includes(city.slug)} disabled={disabled} onPress={() => toggle(city.slug)} testID={`coverage-${city.slug}`} />)}
        </View>
      ) : <RowsSkeleton count={1} minHeight={44} />}
      {error ? <Text role="alert" style={[styles.muted, { color: palette.danger }]}>{error}</Text> : null}
    </View>
  );
}

/** People read "Santa Cruz de la Sierra"; the catalogue stores "santa-cruz". Unknown slugs (a city retired later) stay as they are. */
export const cityName = (cities: readonly ProviderGeoCity[] | undefined, slug: string): string => cities?.find((city) => city.slug === slug)?.name ?? slug;
export const cityLabel = (city: ProviderGeoCity): string => (city.name === city.department ? city.name : `${city.name} (${city.department})`);
