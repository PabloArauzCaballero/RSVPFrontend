import { useId, type CSSProperties, type ReactNode } from "react";
import { colors, radius, spacing, typography } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { styles } from "../host/ui";

const palette = colors.light;
const MIN_TOUCH = 48;
const row: CSSProperties = { display: "flex", alignItems: "center", gap: spacing[2], minHeight: MIN_TOUCH, padding: spacing[3], border: `1px solid ${palette.border}`, borderRadius: radius.md, background: palette.surface, color: palette.text, fontSize: typography.fontSize.base, fontFamily: styles.body.fontFamily, cursor: "pointer" };
interface AttendanceProps { readonly value: "CONFIRMED" | "DECLINED" | null; readonly onChange: (value: "CONFIRMED" | "DECLINED") => void }

/** Native HTML inputs supply Space/arrow-key behavior instead of the button-only keyboard behavior of RN Web Pressable. */
export function AttendanceChoice({ value, onChange }: AttendanceProps): ReactNode {
  const t = useT();
  const name = useId();
  const options = [{ value: "CONFIRMED", label: t("rsvp.form.confirm") }, { value: "DECLINED", label: t("rsvp.form.decline") }] as const;
  return <fieldset role="radiogroup" style={{ border: 0, padding: 0, margin: 0, minWidth: 0, fontFamily: styles.body.fontFamily }}>
    <legend style={{ color: palette.text, fontSize: typography.fontSize.sm, fontWeight: 600, marginBottom: spacing[2] }}>{t("rsvp.form.statusLegend")}</legend>
    <div style={{ display: "grid", gap: spacing[2] }}>
      {options.map((option) => <label key={option.value} style={{ ...row, borderColor: value === option.value ? palette.primary : palette.border }}>
        <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} style={{ accentColor: palette.primary, width: 20, height: 20, flexShrink: 0 }} />
        <span>{option.label}</span>
      </label>)}
    </div>
  </fieldset>;
}

export function GuestConsent({ value, onChange }: { readonly value: boolean; readonly onChange: (value: boolean) => void }): ReactNode {
  const t = useT();
  return <label style={row}>
    <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} style={{ accentColor: palette.primary, width: 20, height: 20, flexShrink: 0 }} />
    <span>{t("rsvp.form.consent")}</span>
  </label>;
}
