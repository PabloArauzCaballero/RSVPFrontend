import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Enter } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ChoiceGroup, useStyles } from "../ui";
import { CatalogPanel } from "./catalog-panel";
import { StorePanel } from "./store-panel";

/**
 * «Agregar regalo»: one flow with two origins, the catalog of products from verified providers and a store link (D-10
 * decisions 1 and 7). A provider's offer is no longer an origin (A28): services stay in the provider directory and only
 * products can become gifts. The old routes still open this flow, so shared links and bookmarks keep working.
 */
export type Origin = "catalog" | "store";
const ORIGINS: readonly Origin[] = ["catalog", "store"];

export function AddGiftScreen({ initial, ...props }: ScreenProps & { readonly initial: Origin }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [origin, setOrigin] = useState<Origin>(initial);
  return (
    <CelebrationScreen {...props} current="gifts" editable title={t("gifts.host.add.title")} intro={t("gifts.host.add.intro")}>
      {({ celebration }) => {
        const to = (path: string) => () => props.onNavigate(withCelebration(path, celebration.id));
        return (
          <View style={{ gap: spacing[4] }}>
            <ChoiceGroup<Origin> label={t("gifts.host.add.originLabel")} value={origin} onChange={setOrigin} choices={ORIGINS.map((value) => ({ value, label: t(`gifts.host.add.origin.${value}`), testID: `origin-${value}` }))} />
            <Enter key={origin} from="none">
              <View style={{ gap: spacing[4] }}>
                <Text style={styles.muted}>{t(`gifts.host.add.hint.${origin}`)}</Text>
                {origin === "catalog" ? <CatalogPanel celebrationId={celebration.id} currency={celebration.currency} onSeeList={to(HOST_ROUTES.gifts)} /> : null}
                {origin === "store" ? <StorePanel celebration={celebration} onSeeList={to(HOST_ROUTES.gifts)} onChangeRule={to(HOST_ROUTES.modes)} /> : null}
              </View>
            </Enter>
          </View>
        );
      }}
    </CelebrationScreen>
  );
}
