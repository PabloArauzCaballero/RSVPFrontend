import type { ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { TranslatedEventType } from "@rsvp/query-hooks";
import { brand, colors, radius, spacing } from "@rsvp/design-tokens";
import { CheckMark } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { asRecord, asRecords, asText, type ScheduleDraft, type WallClock } from "./content-draft";
import { EDITOR_SECTIONS, editorSectionLabel, type EditorSection } from "./routes";
import { styles } from "./ui";

/**
 * The parts of the invitation as one list with their progress ("4 of 6 parts ready"). It replaces the second row of
 * tabs the editor used to draw under the frame's own: the frame owns "Content / Photos / Languages / Style / Preview",
 * this list owns what is inside Content. Wide screens show it beside the form; narrow ones open the form under the row.
 */

export type SectionState = "ready" | "missing" | "optional";
const MARKER = 24;
const TICK = 14;
const HOST_PREFIX = "hosts.";
const palette = colors.light;
const focusRing = Platform.select({ web: { outlineColor: brand.cielo, outlineWidth: 2, outlineOffset: -2 }, default: {} }) as object;

const filled = (value: unknown): boolean => asText(value).trim().length > 0;
const hasRows = (value: unknown, key: string): boolean => asRecords(value).some((row) => filled(row[key]));

export interface StateInput { readonly draft: Readonly<Record<string, unknown>>; readonly eventDate: WallClock; readonly schedule: readonly ScheduleDraft[]; readonly eventType: TranslatedEventType | undefined }

/**
 * A part is "ready" when it has what it needs; "missing" only for the parts the event type requires to publish (the
 * basics and the hosts); optional parts that are empty say so instead of nagging.
 */
export function sectionStates({ draft, eventDate, schedule, eventType }: StateInput): Record<EditorSection, SectionState> {
  const required = eventType?.requiredFieldsForPublish ?? [];
  const basics = required.filter((field) => !field.startsWith(HOST_PREFIX));
  const basicsFilled = (basics.length ? basics : ["title"]).every((field) => (field === "eventDate" ? Boolean(eventDate.date.trim() && eventDate.time.trim()) : filled(draft[field])));
  const hostRoles = required.filter((field) => field.startsWith(HOST_PREFIX)).map((field) => field.slice(HOST_PREFIX.length));
  const hosts = asRecord(draft["hosts"]);
  const hostsFilled = hostRoles.length ? hostRoles.every((role) => filled(hosts[role])) : Object.values(hosts).some(filled);
  const extras = filled(draft["dressCode"]) || hasRows(draft["faq"], "question") || hasRows(draft["recommendations"], "name");
  const optional = (has: boolean): SectionState => (has ? "ready" : "optional");
  return {
    general: basicsFilled ? "ready" : "missing",
    anfitriones: hostsFilled ? "ready" : hostRoles.length ? "missing" : "optional",
    lugares: optional(hasRows(draft["venues"], "name")),
    historia: optional(filled(draft["story"])),
    itinerario: optional(schedule.some((item) => item.title.trim())),
    secciones: optional(extras)
  };
}

export const readyCount = (states: Readonly<Record<EditorSection, SectionState>>): number => EDITOR_SECTIONS.filter((section) => states[section] === "ready").length;

function Marker({ state }: { readonly state: SectionState }): ReactNode {
  const ready = state === "ready";
  return (
    <View style={{ width: MARKER, height: MARKER, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: ready ? brand.azul : "transparent", borderWidth: ready ? 0 : 2, borderColor: state === "missing" ? brand.ambar : palette.fieldBorder }}>
      {ready ? <CheckMark size={TICK} tone="white" play={false} /> : null}
    </View>
  );
}

/** Progress as the product shows it everywhere: a bar with the count beside it, never a big number in a tile. */
export function EditorProgress({ done, total }: { readonly done: number; readonly total: number }): ReactNode {
  const t = useT();
  return (
    <View role="progressbar" aria-label={t("host.editor.list")} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={t("host.editor.progress", { done, total })} style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: "row", gap: spacing[1] }}>
        {EDITOR_SECTIONS.map((section, index) => <View key={section} style={{ flex: 1, height: 6, borderRadius: radius.full, backgroundColor: index < done ? brand.azul : brand.bruma }} />)}
      </View>
      <Text style={styles.label}>{t("host.editor.progress", { done, total })}</Text>
    </View>
  );
}

export function SectionRow({ section, state, current, onPress }: { readonly section: EditorSection; readonly state: SectionState; readonly current: boolean; readonly onPress: () => void }): ReactNode {
  const t = useT();
  const name = t(editorSectionLabel[section]);
  const status = t(`host.editor.status.${state}`);
  return (
    <Pressable role="link" aria-current={current ? "page" : undefined} accessibilityLabel={`${name}, ${status}`} onPress={onPress}
      style={[{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.md, backgroundColor: current ? brand.bruma : "transparent" }, focusRing]}>
      <Marker state={state} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.body, { fontWeight: current ? "800" : "600" }]}>{name}</Text>
        <Text style={styles.muted}>{status}</Text>
      </View>
    </Pressable>
  );
}
