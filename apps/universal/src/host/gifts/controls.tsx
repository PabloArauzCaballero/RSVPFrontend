import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Checkbox } from "@rsvp/ui";
import { styles } from "../ui";
import type { GiftChoicesProps, GiftConsentProps } from "./controls.types";

export function GiftChoices({ label, value, choices, onChange, disabled, prefix }: GiftChoicesProps): ReactNode {
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: spacing[2] }}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.row}>{choices.map((choice) => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label}
      accessibilityState={{ checked: value === choice.value, disabled }} aria-checked={value === choice.value} disabled={disabled}
      testID={prefix ? `${prefix}-${choice.value}` : undefined} onPress={() => onChange(choice.value)}
      style={[styles.option, value === choice.value && styles.optionSelected, { minHeight: 48, justifyContent: "center", flexShrink: 1 }]}>
      <Text style={styles.body}>{choice.label}</Text>{choice.description ? <Text style={styles.muted}>{choice.description}</Text> : null}
    </Pressable>)}</View>
  </View>;
}

export const GiftCategory = GiftChoices;

export function GiftConsent({ label, value, onChange, disabled }: GiftConsentProps): ReactNode {
  return <Checkbox label={label} value={value} onChange={onChange} state={disabled ? "disabled" : "default"} />;
}
