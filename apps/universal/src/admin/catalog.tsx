import { useState, type ReactNode } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { supportedLocales } from "@rsvp/i18n";
import { radius, spacing } from "@rsvp/design-tokens";
import { Button, Chip, OverlayEnter, PressFeedback, overlayAnimation, useColors } from "@rsvp/ui";
import { useAdminCategories, useAdminGeography, useUpsertCategory, useUpsertGeoEntry, type GeoEntry, type GeoKind, type ProviderCategory } from "@rsvp/query-hooks/admin";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ChoiceGroup, Field, FilterSelect, Notice, PageIntro, useStyles } from "../host/ui";
import { AdminScreen, adminOnly, useHeaderSlot } from "./admin-screen";
import { AdminErrorNotice, QueryBoundary, Stack } from "./shared";
import { useSingleMutation } from "../platform/single-flight";

/**
 * E5 categories and E6 geography: catalogs of provider-catalog-service (REQ-F14-01). Each screen is one list to read
 * (name, what it is, whether it is in use) whose rows open the entry; the form only exists while an entry is being
 * created or edited, in a dialog, so the list is never pushed down by an empty form.
 */

const CODE = /^[A-Z][A-Z0-9_]{1,39}$/;
/** Cities are lowercase slugs ("santa-cruz"); regions keep upper-case codes. The country entry is read-only on the server. */
const CITY_CODE = /^[a-z][a-z0-9-]{1,39}$/;
type Nav = { readonly onNavigate: (href: string) => void };
type Names = Readonly<Record<string, string>>;
/** A list longer than this gets a search box. */
const SEARCH_FROM = 7;
const DIALOG_WIDTH = 560;
const ROW_MIN = 64;
const CHEVRON = 8;
const MAX_LAT = 90;
const MAX_LNG = 180;

const namesOf = (form: Names): Record<string, string> => Object.fromEntries(supportedLocales.flatMap((locale) => (form[locale]?.trim() ? [[locale, form[locale]?.trim() ?? ""]] : [])));

function NameFields({ names, onChange, errorFor }: { readonly names: Names; readonly onChange: (names: Names) => void; readonly errorFor?: string }): ReactNode {
  const t = useT();
  return (
    <>
      {supportedLocales.map((locale, index) => (
        <Field key={locale} label={t("admin.common.name", { locale: t(`celebration.language.${locale}`) })} value={names[locale] ?? ""} onChange={(value) => onChange({ ...names, [locale]: value })} testID={`catalog-name-${locale}`} {...(index === 0 && errorFor ? { error: errorFor } : {})} />
      ))}
    </>
  );
}

function ActiveChoice({ value, onChange }: { readonly value: boolean; readonly onChange: (value: boolean) => void }): ReactNode {
  const t = useT();
  return <ChoiceGroup label={t("admin.common.state")} value={value ? "on" : "off"} onChange={(next) => onChange(next === "on")} choices={[{ value: "on", label: t("admin.common.active") }, { value: "off", label: t("admin.common.inactive") }]} />;
}

function useDisplayName(): (names: Names, fallback: string) => string {
  const locale = useLocale();
  return (names, fallback) => names[locale] ?? Object.values(names)[0] ?? fallback;
}

/** One entry of a catalog as a row: what it is called, one quiet line about it, its state as a pill. The whole row opens it. */
function CatalogRow({ name, detail, active, last, onOpen }: { readonly name: string; readonly detail: string; readonly active: boolean; readonly last: boolean; readonly onOpen: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  return (
    <PressFeedback accessibilityRole="button" accessibilityLabel={t("admin.common.editItem", { name })} hoverTint onPress={onOpen} style={{ minHeight: ROW_MIN, paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: last ? 0 : 1, borderBottomColor: palette.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={styles.itemTitle}>{name}</Text>
          <Text numberOfLines={1} style={styles.muted}>{detail}</Text>
        </View>
        <Chip tone={active ? "yes" : "wait"}>{t(active ? "admin.common.active" : "admin.common.inactive")}</Chip>
        <View aria-hidden style={{ width: CHEVRON, height: CHEVRON, borderTopWidth: 2, borderRightWidth: 2, borderColor: palette.textMuted, transform: [{ rotate: "45deg" }], marginRight: spacing[1] }} />
      </View>
    </PressFeedback>
  );
}

interface Row { readonly key: string; readonly name: string; readonly detail: string; readonly active: boolean }

/** The catalog as one bordered list with its count; a search box appears once the list is long enough to need one. */
function CatalogList({ rows, countLabel, onOpen }: { readonly rows: readonly Row[]; readonly countLabel: (count: number) => string; readonly onOpen: (key: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const [query, setQuery] = useState("");
  const wanted = query.trim().toLocaleLowerCase();
  const shown = wanted ? rows.filter((row) => `${row.name} ${row.detail}`.toLocaleLowerCase().includes(wanted)) : rows;
  return (
    <View style={{ gap: spacing[3] }}>
      {rows.length >= SEARCH_FROM ? <View style={{ maxWidth: 360 }}><Field label={t("admin.common.search")} value={query} onChange={setQuery} testID="catalog-search" /></View> : null}
      <Text role="status" style={styles.muted}>{countLabel(shown.length)}</Text>
      {shown.length ? (
        <View role="list" style={{ borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, backgroundColor: palette.surface, overflow: "hidden" }}>
          {shown.map((row, index) => <View role="listitem" key={row.key}><CatalogRow name={row.name} detail={row.detail} active={row.active} last={index === shown.length - 1} onOpen={() => onOpen(row.key)} /></View>)}
        </View>
      ) : <Text style={styles.body}>{t("admin.common.noMatches")}</Text>}
    </View>
  );
}

/** The form of one entry, over the list: title, fields that scroll, and the two closing actions always in sight. */
function EditorDialog({ title, saveLabel, saveTestID, busy, canSave = true, onSave, onClose, children }: { readonly title: string; readonly saveLabel: string; readonly saveTestID: string; readonly busy: boolean; readonly canSave?: boolean; readonly onSave: () => void; readonly onClose: () => void; readonly children: ReactNode }): ReactNode {
  const t = useT();
  const styles = useStyles();
  return (
    <Modal visible transparent animationType={overlayAnimation("fade")} onRequestClose={busy ? () => undefined : onClose}>
      <View style={styles.overlay}>
        <OverlayEnter from="none">
          <View accessibilityViewIsModal role="dialog" aria-label={title} style={[styles.dialog, { maxWidth: DIALOG_WIDTH, maxHeight: "94%" }]}>
            <Text accessibilityRole="header" style={styles.subtitle}>{title}</Text>
            <ScrollView tabIndex={0} aria-label={title} style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[1] }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              <View style={{ flex: 1 }}><Button variant="secondary" icon="close" block state={busy ? "disabled" : "default"} onPress={onClose} testID="catalog-cancel">{t("host.common.cancel")}</Button></View>
              <View style={{ flex: 1 }}><Button icon="check" block state={busy ? "loading" : canSave ? "default" : "disabled"} onPress={onSave} testID={saveTestID}>{saveLabel}</Button></View>
            </View>
          </View>
        </OverlayEnter>
      </View>
    </Modal>
  );
}

function CategoryEditor({ initial, onClose, onSaved }: { readonly initial: ProviderCategory | null; readonly onClose: () => void; readonly onSaved: () => void }): ReactNode {
  const t = useT();
  const display = useDisplayName();
  const save = useUpsertCategory(useApiClient());
  const saveOnce = useSingleMutation(save);
  const [code, setCode] = useState(initial?.code ?? "");
  const [names, setNames] = useState<Names>(initial?.names ?? {});
  const [active, setActive] = useState(initial?.active ?? true);
  const [invalid, setInvalid] = useState(false);
  const submit = (): void => {
    const cleanCode = code.trim().toUpperCase();
    const cleanNames = namesOf(names);
    if (!CODE.test(cleanCode) || Object.keys(cleanNames).length === 0) { setInvalid(true); return; }
    setInvalid(false);
    saveOnce({ code: cleanCode, names: cleanNames, active }, { onSuccess: onSaved });
  };
  return (
    <EditorDialog title={initial ? t("admin.common.editItem", { name: display(initial.names, initial.code) }) : t("admin.categories.new")} saveLabel={t("admin.common.save")} saveTestID="save-category" busy={save.isPending} onSave={submit} onClose={onClose}>
      <NameFields names={names} onChange={setNames} {...(invalid && Object.keys(namesOf(names)).length === 0 ? { errorFor: t("admin.common.nameRequired") } : {})} />
      {/* The code identifies the entry: it is chosen once, when creating. */}
      <Field label={t("admin.common.code")} help={t(initial ? "admin.common.codeFixed" : "admin.common.codeHelp")} value={code} onChange={setCode} editable={!initial} mono testID="category-code" {...(invalid && !CODE.test(code.trim().toUpperCase()) ? { error: t("admin.common.codeInvalid") } : {})} />
      <ActiveChoice value={active} onChange={setActive} />
      <AdminErrorNotice error={save.error} onRetry={submit} />
    </EditorDialog>
  );
}

/** What the screen is doing with the form: nothing, a new entry, or the entry with that code. */
type Editing = { readonly code: string | null } | null;

function CategoriesScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const list = useAdminCategories(useApiClient());
  const display = useDisplayName();
  const [editing, setEditing] = useState<Editing>(null);
  const [saved, setSaved] = useState(false);
  const current = editing?.code ? list.data?.items.find((item) => item.code === editing.code) ?? null : null;
  return (
    <AdminScreen title={t("admin.categories.title")} current="categories" onNavigate={onNavigate}>
      <CategoriesHeader onNew={() => { setSaved(false); setEditing({ code: null }); }} />
      <Stack>
      <PageIntro>{t("admin.categories.intro")}</PageIntro>
      {saved ? <Notice kind="success">{t("admin.saved")}</Notice> : null}
      <QueryBoundary query={list} empty={t("admin.categories.empty")}>
        {(data) => <CatalogList rows={data.items.map((item) => ({ key: item.code, name: display(item.names, item.code), detail: item.code, active: item.active }))} countLabel={(count) => t("admin.categories.count", { count })} onOpen={(code) => { setSaved(false); setEditing({ code }); }} />}
      </QueryBoundary>
      {editing ? <CategoryEditor key={editing.code ?? "new"} initial={current} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSaved(true); }} /> : null}
      </Stack>
    </AdminScreen>
  );
}

/** The screen's one primary action lives in the header (top right; a fixed bar on a phone). */
function CategoriesHeader({ onNew }: { readonly onNew: () => void }): null {
  const t = useT();
  useHeaderSlot({ primary: { label: t("admin.categories.new"), icon: "plus", onPress: onNew, testID: "new-category" } });
  return null;
}

function GeographyHeader({ onNew }: { readonly onNew: () => void }): null {
  const t = useT();
  useHeaderSlot({ primary: { label: t("admin.geography.new"), icon: "plus", onPress: onNew, testID: "new-geo" } });
  return null;
}

const KINDS: readonly GeoKind[] = ["REGION", "CITY"];
const KIND_ORDER: Readonly<Record<GeoKind, number>> = { COUNTRY: 0, REGION: 1, CITY: 2 };
export const inRange = (value: string, limit: number): boolean => value.trim() !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;

export function GeoEditor({ initial, places, onClose, onSaved }: { readonly initial: GeoEntry | null; readonly places: readonly GeoEntry[]; readonly onClose: () => void; readonly onSaved: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const display = useDisplayName();
  const save = useUpsertGeoEntry(useApiClient());
  const saveOnce = useSingleMutation(save);
  const [code, setCode] = useState(initial?.code ?? "");
  const [kind, setKind] = useState<GeoKind>(initial?.kind ?? "CITY");
  const [parent, setParent] = useState(initial?.parentCode ?? "");
  const [names, setNames] = useState<Names>(initial?.names ?? {});
  const [active, setActive] = useState(initial?.active ?? true);
  const [latitude, setLatitude] = useState(initial?.latitude === undefined ? "" : String(initial.latitude));
  const [longitude, setLongitude] = useState(initial?.longitude === undefined ? "" : String(initial.longitude));
  const [invalid, setInvalid] = useState(false);
  const readOnly = initial?.kind === "COUNTRY";
  const isCity = kind === "CITY";
  const cleanCode = isCity ? code.trim().toLowerCase() : code.trim().toUpperCase();
  const codeOk = (isCity ? CITY_CODE : CODE).test(cleanCode);
  const hasCoords = latitude.trim() !== "" || longitude.trim() !== "";
  const coordsOk = !isCity || (hasCoords ? inRange(latitude, MAX_LAT) && inRange(longitude, MAX_LNG) : initial !== null);
  // A city hangs from a region or a country; a region, from a country. The choice is made among what exists, never typed.
  const parents = places.filter((place) => place.code !== initial?.code && (isCity ? place.kind !== "CITY" : place.kind === "COUNTRY"));
  const parentOptions = [{ value: "", label: t("admin.geography.parentChoose") }, ...parents.map((place) => ({ value: place.code, label: `${display(place.names, place.code)} · ${t(`admin.geography.kinds.${place.kind}`)}` })), ...(parent && !parents.some((place) => place.code === parent) ? [{ value: parent, label: parent }] : [])];
  const submit = (): void => {
    const cleanNames = namesOf(names);
    if (readOnly) return;
    if (!codeOk || Object.keys(cleanNames).length === 0 || !parent.trim() || !coordsOk) { setInvalid(true); return; }
    setInvalid(false);
    saveOnce({ code: cleanCode, kind, parentCode: parent.trim().toUpperCase(), names: cleanNames, active, ...(isCity && hasCoords ? { latitude: Number(latitude), longitude: Number(longitude) } : {}) }, { onSuccess: onSaved });
  };
  return (
    <EditorDialog title={initial ? t("admin.common.editItem", { name: display(initial.names, initial.code) }) : t("admin.geography.new")} saveLabel={t("admin.common.save")} saveTestID="save-geo" busy={save.isPending} canSave={!readOnly} onSave={submit} onClose={onClose}>
      {readOnly ? <Notice>{t("admin.geography.countryReadOnly")}</Notice> : null}
      {initial ? null : <ChoiceGroup label={t("admin.geography.kind")} value={kind} onChange={(next) => { setKind(next); setParent(""); }} choices={KINDS.map((value) => ({ value, label: t(`admin.geography.kinds.${value}`) }))} />}
      <NameFields names={names} onChange={setNames} {...(invalid && Object.keys(namesOf(names)).length === 0 ? { errorFor: t("admin.common.nameRequired") } : {})} />
      <Field label={t("admin.common.code")} help={t(initial ? "admin.common.codeFixed" : isCity ? "admin.geography.codeHelpCity" : "admin.common.codeHelp")} value={code} onChange={setCode} editable={!initial} mono testID="geo-code" {...(invalid && !codeOk ? { error: t(isCity ? "admin.geography.codeInvalidCity" : "admin.common.codeInvalid") } : {})} />
      {readOnly ? null : (
        <View style={{ gap: spacing[1], alignItems: "flex-start" }}>
          <Text style={styles.label}>{t("admin.geography.parent")}</Text>
          <FilterSelect label={t("admin.geography.parent")} value={parent} onChange={setParent} options={parentOptions} testID="geo-parent" />
          <Text style={[styles.muted, invalid && !parent.trim() ? { color: palette.danger } : null]}>{invalid && !parent.trim() ? t("admin.geography.parentRequired") : t("admin.geography.parentHelp")}</Text>
        </View>
      )}
      {isCity ? (
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <View style={{ flexGrow: 1, flexBasis: 160 }}><Field label={t("admin.geography.latitude")} value={latitude} onChange={setLatitude} keyboardType="decimal-pad" testID="geo-latitude" /></View>
          <View style={{ flexGrow: 1, flexBasis: 160 }}><Field label={t("admin.geography.longitude")} value={longitude} onChange={setLongitude} keyboardType="decimal-pad" testID="geo-longitude" {...(invalid && !coordsOk ? { error: t("admin.geography.coordsRequired") } : {})} /></View>
        </View>
      ) : null}
      {readOnly ? null : <ActiveChoice value={active} onChange={setActive} />}
      <AdminErrorNotice error={save.error} onRetry={submit} />
    </EditorDialog>
  );
}

function GeographyScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const list = useAdminGeography(useApiClient());
  const display = useDisplayName();
  const [editing, setEditing] = useState<Editing>(null);
  const [saved, setSaved] = useState(false);
  const items = list.data?.items ?? [];
  const current = editing?.code ? items.find((item) => item.code === editing.code) ?? null : null;
  const nameOf = (code: string | null | undefined): string => { const place = items.find((item) => item.code === code); return place ? display(place.names, place.code) : code ?? ""; };
  return (
    <AdminScreen title={t("admin.geography.title")} current="geography" onNavigate={onNavigate}>
      <GeographyHeader onNew={() => { setSaved(false); setEditing({ code: null }); }} />
      <Stack>
      <PageIntro>{t("admin.geography.intro")}</PageIntro>
      {saved ? <Notice kind="success">{t("admin.saved")}</Notice> : null}
      <QueryBoundary query={list} empty={t("admin.geography.empty")}>
        {(data) => (
          <CatalogList countLabel={(count) => t("admin.geography.count", { count })} onOpen={(code) => { setSaved(false); setEditing({ code }); }}
            rows={[...data.items].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || display(a.names, a.code).localeCompare(display(b.names, b.code))).map((item) => ({ key: item.code, name: display(item.names, item.code), detail: [t(`admin.geography.kinds.${item.kind}`), item.parentCode ? t("admin.geography.inside", { parent: nameOf(item.parentCode) }) : ""].filter(Boolean).join(" · "), active: item.active }))} />
        )}
      </QueryBoundary>
      {editing ? <GeoEditor key={editing.code ?? "new"} initial={current} places={items} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSaved(true); }} /> : null}
      </Stack>
    </AdminScreen>
  );
}

export const CategoriesScreen = adminOnly(CategoriesScreenContent);

export const GeographyScreen = adminOnly(GeographyScreenContent);
