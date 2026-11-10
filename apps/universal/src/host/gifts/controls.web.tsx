import { useId, type CSSProperties, type ReactNode } from "react";
import { colors, radius, spacing, typography } from "@rsvp/design-tokens";
import { styles } from "../ui";
import type { GiftChoicesProps, GiftConsentProps } from "./controls.types";

const palette = colors.light;
const input: CSSProperties = { border: `1px solid ${palette.border}`, borderRadius: radius.md, padding: spacing[3], minHeight: 48, color: palette.text, background: palette.surface, fontSize: typography.fontSize.base, fontFamily: styles.body.fontFamily, maxWidth: "100%", width: "100%" };

/** HTML controls provide native Space/arrow-key behavior on the web surface. */
export function GiftChoices({ label, value, choices, onChange, disabled, prefix }: GiftChoicesProps): ReactNode {
  const name = useId();
  return <fieldset disabled={disabled} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, fontFamily: styles.body.fontFamily }}>
    <legend style={{ color: palette.text, fontSize: typography.fontSize.sm, fontWeight: 600, marginBottom: spacing[2] }}>{label}</legend>
    <div style={{ display: "grid", gap: spacing[2] }}>{choices.map((choice) => <label key={choice.value} style={{ ...input, display: "flex", alignItems: "center", gap: spacing[2], borderColor: value === choice.value ? palette.primary : palette.border, cursor: disabled ? "default" : "pointer" }}>
      <input type="radio" name={name} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} data-testid={prefix ? `${prefix}-${choice.value}` : undefined} style={{ accentColor: palette.primary }} />
      <span>{choice.label}{choice.description ? <span style={{ display: "block", color: palette.textMuted, fontSize: typography.fontSize.sm }}>{choice.description}</span> : null}</span>
    </label>)}</div>
  </fieldset>;
}

export function GiftCategory({ label, value, choices, onChange, disabled, prefix }: GiftChoicesProps): ReactNode {
  return <label style={{ display: "grid", gap: spacing[2], color: palette.text, fontSize: typography.fontSize.sm, fontFamily: styles.body.fontFamily }}>
    <span>{label}</span><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} style={input} data-testid={prefix}>
      {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
    </select>
  </label>;
}

export function GiftConsent({ label, value, onChange, disabled }: GiftConsentProps): ReactNode {
  return <label style={{ ...input, display: "flex", alignItems: "center", gap: spacing[2] }}>
    <input type="checkbox" checked={value} disabled={disabled} onChange={(event) => onChange(event.target.checked)} style={{ accentColor: palette.primary }} data-testid="external-reviewed" /><span>{label}</span>
  </label>;
}
