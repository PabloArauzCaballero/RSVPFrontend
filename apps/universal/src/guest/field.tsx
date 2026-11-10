import type { ComponentProps, ReactNode } from "react";
import { Text, View, type KeyboardTypeOptions } from "react-native";
import { Input, useTheme } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import { styles } from "../host/ui";

/** Preserve the themed input frame when a guest field supplies its own multiline sizing. */
export function GuestInput({ style, error, multiline, ...props }: ComponentProps<typeof Input>): ReactNode {
  const { styles: themed } = useTheme();
  return <Input {...props} error={error} multiline={multiline} style={[themed.input, error && themed.inputError, multiline && { minHeight: 112, paddingVertical: spacing[2], textAlignVertical: "top" }, style]} />;
}

interface Props {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly help?: string;
  readonly error?: string;
  readonly multiline?: boolean;
  readonly keyboardType?: KeyboardTypeOptions;
}

export function GuestField({ label, value, onChange, help, ...props }: Props): ReactNode {
  return <View style={{ gap: spacing[1] }}>
    <GuestInput {...props} label={label} value={value} onChangeText={onChange} accessibilityHint={help} />
    {help ? <Text style={styles.muted}>{help}</Text> : null}
  </View>;
}
