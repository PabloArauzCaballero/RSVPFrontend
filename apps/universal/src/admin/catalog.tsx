import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { supportedLocales } from "@rsvp/i18n";
import { useAdminCategories, useAdminGeography, useUpsertCategory, useUpsertGeoEntry, type GeoEntry, type GeoKind, type ProviderCategory } from "@rsvp/query-hooks/admin";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, Field, Notice, PageIntro, Section, styles } from "../host/ui";
import { AdminScreen, adminOnly } from "./admin-screen";
import { AdminErrorNotice, QueryBoundary } from "./shared";
import { useSingleMutation } from "../platform/single-flight";

/** E5 categories and E6 geography: catalogs of provider-catalog-service, edited in place (REQ-F14-01). */

const CODE = /^[A-Z][A-Z0-9_]{1,39}$/;
/** Cities are lowercase slugs ("santa-cruz"); regions keep upper-case codes. The country entry is read-only on the server. */
const CITY_CODE = /^[a-z][a-z0-9-]{1,39}$/;
type Nav = { readonly onNavigate: (href: string) => void };
type Names = Readonly<Record<string, string>>;

const namesOf = (form: Names): Record<string, string> => Object.fromEntries(supportedLocales.flatMap((locale) => (form[locale]?.trim() ? [[locale, form[locale]?.trim() ?? ""]] : [])));

function NameFields({ names, onChange, errorFor }: { readonly names: Names; readonly onChange: (names: Names) => void; readonly errorFor?: string }): ReactNode {
  const t = useT();
  return (
    <>
      {supportedLocales.map((locale, index) => (
        <Field key={locale} label={t("admin.common.name", { locale })} value={names[locale] ?? ""} onChange={(value) => onChange({ ...names, [locale]: value })} testID={`catalog-name-${locale}`} {...(index === 0 && errorFor ? { error: errorFor } : {})} />
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

function CategoryEditor({ initial }: { readonly initial: ProviderCategory | null }): ReactNode {
  const t = useT();
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
    saveOnce({ code: cleanCode, names: cleanNames, active });
  };
  return (
    <Section title={initial ? t("admin.categories.edit", { code: initial.code }) : t("admin.categories.new")}>
      <Field label={t("admin.common.code")} help={t("admin.common.codeHelp")} value={code} onChange={setCode} testID="category-code" {...(invalid && !CODE.test(code.trim().toUpperCase()) ? { error: t("admin.common.codeInvalid") } : {})} />
      <NameFields names={names} onChange={setNames} {...(invalid && Object.keys(namesOf(names)).length === 0 ? { errorFor: t("admin.common.nameRequired") } : {})} />
      <ActiveChoice value={active} onChange={setActive} />
      <AdminErrorNotice error={save.error} onRetry={submit} />
      {save.isSuccess ? <Notice kind="success">{t("admin.saved")}</Notice> : null}
      <ActionButton label={t("admin.common.save")} busy={save.isPending} disabled={save.isPending} onPress={submit} testID="save-category" />
    </Section>
  );
}

function CategoriesScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const list = useAdminCategories(useApiClient());
  const display = useDisplayName();
  const [editing, setEditing] = useState<string | null>(null);
  const current = list.data?.items.find((item) => item.code === editing) ?? null;
  return (
    <AdminScreen title={t("admin.categories.title")} current="categories" onNavigate={onNavigate}>
      <PageIntro>{t("admin.categories.intro")}</PageIntro>
      <QueryBoundary query={list} empty={t("admin.categories.empty")}>
        {(data) => (
          <Section title={t("admin.categories.list")}>
            {data.items.map((item) => (
              <View key={item.code} style={styles.row}>
                <Text style={styles.body}>{`${display(item.names, item.code)} · ${item.code} · ${item.active ? t("admin.common.active") : t("admin.common.inactive")}`}</Text>
                <ActionButton variant="secondary" label={t("admin.common.editItem", { name: display(item.names, item.code) })} onPress={() => setEditing(item.code)} />
              </View>
            ))}
          </Section>
        )}
      </QueryBoundary>
      {editing ? <ActionButton variant="secondary" label={t("admin.categories.new")} onPress={() => setEditing(null)} /> : null}
      <CategoryEditor key={editing ?? "new"} initial={current} />
    </AdminScreen>
  );
}

const KINDS: readonly GeoKind[] = ["REGION", "CITY"];
export const inRange = (value: string, limit: number): boolean => value.trim() !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;

export function GeoEditor({ initial }: { readonly initial: GeoEntry | null }): ReactNode {
  const t = useT();
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
  const coordsOk = !isCity || (hasCoords ? inRange(latitude, 90) && inRange(longitude, 180) : initial !== null);
  const submit = (): void => {
    const cleanNames = namesOf(names);
    if (!codeOk || Object.keys(cleanNames).length === 0 || !parent.trim() || !coordsOk) { setInvalid(true); return; }
    setInvalid(false);
    saveOnce({ code: cleanCode, kind, parentCode: parent.trim().toUpperCase(), names: cleanNames, active, ...(isCity && hasCoords ? { latitude: Number(latitude), longitude: Number(longitude) } : {}) });
  };
  return (
    <Section title={initial ? t("admin.geography.edit", { code: initial.code }) : t("admin.geography.new")}>
      {readOnly ? <Notice>{t("admin.geography.countryReadOnly")}</Notice> : null}
      <Field label={t("admin.common.code")} help={t(isCity ? "admin.geography.codeHelpCity" : "admin.common.codeHelp")} value={code} onChange={setCode} testID="geo-code" {...(invalid && !codeOk ? { error: t(isCity ? "admin.geography.codeInvalidCity" : "admin.common.codeInvalid") } : {})} />
      <ChoiceGroup label={t("admin.geography.kind")} value={kind} onChange={setKind} choices={KINDS.map((value) => ({ value, label: t(`admin.geography.kinds.${value}`) }))} />
      <Field label={t("admin.geography.parent")} help={t("admin.geography.parentHelp")} value={parent} onChange={setParent} testID="geo-parent" {...(invalid && !parent.trim() ? { error: t("admin.geography.parentRequired") } : {})} />
      {isCity ? (
        <>
          <Field label={t("admin.geography.latitude")} value={latitude} onChange={setLatitude} keyboardType="decimal-pad" testID="geo-latitude" />
          <Field label={t("admin.geography.longitude")} value={longitude} onChange={setLongitude} keyboardType="decimal-pad" testID="geo-longitude" {...(invalid && !coordsOk ? { error: t("admin.geography.coordsRequired") } : {})} />
        </>
      ) : null}
      <NameFields names={names} onChange={setNames} {...(invalid && Object.keys(namesOf(names)).length === 0 ? { errorFor: t("admin.common.nameRequired") } : {})} />
      <ActiveChoice value={active} onChange={setActive} />
      <AdminErrorNotice error={save.error} onRetry={submit} />
      {save.isSuccess ? <Notice kind="success">{t("admin.saved")}</Notice> : null}
      <ActionButton label={t("admin.common.save")} busy={save.isPending} disabled={readOnly || save.isPending} onPress={submit} testID="save-geo" />
    </Section>
  );
}

function GeographyScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const list = useAdminGeography(useApiClient());
  const display = useDisplayName();
  const [editing, setEditing] = useState<string | null>(null);
  const current = list.data?.items.find((item) => item.code === editing) ?? null;
  return (
    <AdminScreen title={t("admin.geography.title")} current="geography" onNavigate={onNavigate}>
      <PageIntro>{t("admin.geography.intro")}</PageIntro>
      <QueryBoundary query={list} empty={t("admin.geography.empty")}>
        {(data) => (
          <Section title={t("admin.geography.list")}>
            {data.items.map((item) => (
              <View key={item.code} style={styles.row}>
                <Text style={styles.body}>{`${display(item.names, item.code)} · ${t(`admin.geography.kinds.${item.kind}`)}${item.parentCode ? ` · ${item.parentCode}` : ""} · ${item.active ? t("admin.common.active") : t("admin.common.inactive")}`}</Text>
                <ActionButton variant="secondary" label={t("admin.common.editItem", { name: display(item.names, item.code) })} onPress={() => setEditing(item.code)} />
              </View>
            ))}
          </Section>
        )}
      </QueryBoundary>
      {editing ? <ActionButton variant="secondary" label={t("admin.geography.new")} onPress={() => setEditing(null)} /> : null}
      <GeoEditor key={editing ?? "new"} initial={current} />
    </AdminScreen>
  );
}

export const CategoriesScreen = adminOnly(CategoriesScreenContent);

export const GeographyScreen = adminOnly(GeographyScreenContent);
