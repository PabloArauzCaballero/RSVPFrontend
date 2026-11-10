import type { ReactNode } from "react";
import { Checkbox } from "@rsvp/ui";
import { ChoiceGroup } from "../host/ui";
import { useT } from "../platform/providers";

interface AttendanceProps { readonly value: "CONFIRMED" | "DECLINED" | null; readonly onChange: (value: "CONFIRMED" | "DECLINED") => void }

export function AttendanceChoice({ value, onChange }: AttendanceProps): ReactNode {
  const t = useT();
  return <ChoiceGroup label={t("rsvp.form.statusLegend")} value={value} onChange={onChange} choices={[
    { value: "CONFIRMED", label: t("rsvp.form.confirm") },
    { value: "DECLINED", label: t("rsvp.form.decline") }
  ]} />;
}

export function GuestConsent({ value, onChange }: { readonly value: boolean; readonly onChange: (value: boolean) => void }): ReactNode {
  const t = useT();
  return <Checkbox label={t("rsvp.form.consent")} value={value} onChange={onChange} />;
}
