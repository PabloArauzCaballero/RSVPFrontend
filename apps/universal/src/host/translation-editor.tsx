import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { supportedLocales } from "@rsvp/i18n";
import { useEditCelebration, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { asRecord, asRecords, asText, scheduleDraft } from "./content-draft";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LIMITS, overLimit } from "./limits";
import { useSaveHeader } from "./save-bar";
import { ChoiceGroup, EmptyState, Field, OverflowMenu, useStyles } from "./ui";

/** C13 · The same content in each language of the site (REQ-F11-03). Times are never translated. */

const TEXT_FIELDS = ["title", "subtitle", "story", "dressCode"] as const;
type Overrides = Record<string, unknown>;

export function translatableLocales(celebration: Pick<Celebration, "supportedLocales" | "defaultLocale">): string[] {
  return celebration.supportedLocales.filter((locale) => locale !== celebration.defaultLocale);
}

const filled = (value: unknown): boolean => asText(value).trim().length > 0;

/** How many of the texts that exist in the original already have a translation in this language. */
export function translationProgress(celebration: Pick<Celebration, "content" | "localTimes">, overrides: Overrides): { readonly done: number; readonly total: number } {
  const faq = asRecords(celebration.content["faq"]);
  const faqDraft = asRecords(overrides["faq"]);
  const labels = asRecord(overrides["scheduleLabels"]);
  const pairs: boolean[] = [
    ...TEXT_FIELDS.filter((field) => filled(celebration.content[field])).map((field) => filled(overrides[field])),
    ...faq.flatMap((item, index) => (["question", "answer"] as const).filter((part) => filled(item[part])).map((part) => filled(faqDraft[index]?.[part]))),
    ...scheduleDraft(celebration).filter((item) => item.title.trim()).map((item) => filled(asRecord(labels[item.id])["title"]))
  ];
  return { done: pairs.filter(Boolean).length, total: pairs.length };
}

const clean = (overrides: Overrides): Overrides => Object.fromEntries(Object.entries(overrides).filter(([, value]) => (typeof value === "string" ? value.trim() : value !== undefined)));

function Translations({ celebration, refetch, saved, onSaved }: { readonly celebration: Celebration; readonly refetch: () => void; readonly saved: boolean; readonly onSaved: (saved: boolean) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const once = useSingleFlight();
  const client = useApiClient();
  const mutation = useEditCelebration(client, celebration.id);
  const locales = translatableLocales(celebration);
  const [locale, setLocale] = useState<string | null>(locales[0] ?? null);
  const [drafts, setDrafts] = useState<Record<string, Overrides>>(() => Object.fromEntries(locales.map((code) => [code, { ...(celebration.translations[code] ?? {}) }])));
  const missing = supportedLocales.filter((code) => !celebration.supportedLocales.includes(code));
  const current = locale ? drafts[locale] ?? {} : {};
  const set = (key: string, value: unknown): void => { if (locale) setDrafts((all) => ({ ...all, [locale]: { ...(all[locale] ?? {}), [key]: value } })); };
  const faq = asRecords(celebration.content["faq"]);
  const faqDraft = asRecords(current["faq"]);
  const labels = asRecord(current["scheduleLabels"]);
  const progress = translationProgress(celebration, current);

  const tooLong = Object.values(current).some((value) => typeof value === "string" && overLimit(value, LIMITS.translation) !== null);
  const dirty = locale ? JSON.stringify(clean(current)) !== JSON.stringify(clean({ ...(celebration.translations[locale] ?? {}) })) : false;
  const save = (): void => {
    if (!locale || tooLong) return;
    onSaved(false);
    const cleaned = clean(current);
    once((release) => { mutation.mutateAsync({ target: celebration, patch: { translations: { [locale]: Object.keys(cleaned).length ? cleaned : null } } }).then(() => onSaved(true), () => undefined).finally(release); });
  };
  const addLanguage = (code: string): void => mutation.mutate({ target: celebration, patch: { supportedLocales: [...celebration.supportedLocales, code] } }, { onSuccess: refetch });
  const addLabel = (code: string): string => `${t("host.translations.addLanguage")}: ${t(`celebration.language.${code}`)}`;
  // Nothing to translate yet: adding the first language is the screen's one action. Afterwards «Guardar» is, and extra languages go to «⋯».
  const firstMissing = missing[0];
  const extra = (locales.length ? missing : missing.slice(1)).map((code) => ({ key: code, label: addLabel(code), onPress: () => addLanguage(code), disabled: mutation.isPending }));
  const menu = extra.length ? <OverflowMenu items={extra} /> : undefined;
  useSaveHeader({
    ...(locales.length
      ? { dirty, saved, busy: mutation.isPending, disabled: tooLong, error: mutation.error, onReload: refetch, onSave: save, saveTestID: "save-translation" }
      : { dirty: false, saved: false, busy: mutation.isPending, disabled: !firstMissing, error: mutation.error, onReload: refetch, onSave: () => { if (firstMissing) addLanguage(firstMissing); }, saveTestID: "add-language", ...(firstMissing ? { label: addLabel(firstMissing) } : {}) }),
    ...(menu ? { menu } : {})
  });

  if (!locales.length) {
    return (
      <View style={{ gap: spacing[4] }}>
        <EmptyState illustration="welcomeGuest" title={t("host.translations.emptyTitle")} body={t("host.translations.emptyBody")} />
        <CelebrationErrorNotice error={mutation.error} onReload={refetch} />
      </View>
    );
  }
  return (
    <View style={{ gap: spacing[4] }}>
      {locales.length > 1 ? <ChoiceGroup label={t("host.translations.language")} value={locale} onChange={setLocale} choices={locales.map((code) => ({ value: code, label: t(`celebration.language.${code}`) }))} /> : null}
      <View style={{ gap: spacing[4], maxWidth: 720 }}>
        <View style={{ gap: spacing[1] }}>
          <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t(`celebration.language.${locale ?? ""}`)}</Text>
          <Text style={styles.muted}>{t("host.translations.progress", progress)}</Text>
        </View>
        {TEXT_FIELDS.map((field) => (
          <Field key={field} label={t(`host.translations.fields.${field}`)} value={asText(current[field])} onChange={(value) => set(field, value)} multiline={field === "story"} {...(overLimit(asText(current[field]), LIMITS.translation) !== null ? { error: t("host.limits.tooLong", { count: overLimit(asText(current[field]), LIMITS.translation) ?? 0, max: LIMITS.translation }) } : {})}
            help={asText(celebration.content[field]) ? t("host.translations.original", { text: asText(celebration.content[field]) }) : undefined} />
        ))}
        {faq.map((item, index) => (
          <View key={`faq-${index}`} style={{ gap: spacing[2] }}>
            <Text style={styles.label}>{t("host.translations.faqItem", { n: index + 1 })}</Text>
            {(["question", "answer"] as const).map((part) => (
              <Field key={part} label={t(`host.editor.extra.${part}`)} value={asText(faqDraft[index]?.[part])} help={t("host.translations.original", { text: asText(item[part]) })}
                onChange={(value) => set("faq", faq.map((_original, position) => ({ question: asText(faqDraft[position]?.["question"]), answer: asText(faqDraft[position]?.["answer"]), ...(position === index ? { [part]: value } : {}) })))} />
            ))}
          </View>
        ))}
        {scheduleDraft(celebration).map((item, index) => (
          <Field key={item.id} label={t("host.translations.scheduleItem", { n: index + 1 })} value={asText(asRecord(labels[item.id])["title"])} help={t("host.translations.original", { text: item.title })}
            onChange={(value) => set("scheduleLabels", { ...labels, [item.id]: { title: value } })} />
        ))}
      </View>
    </View>
  );
}

export function TranslationEditorScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  // The form restarts from the stored content after each save (keyed by version), so the confirmation lives here.
  const [saved, setSaved] = useState(false);
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="translations" editable title={t("host.translations.title")} intro={t("host.translations.intro")}>
      {({ celebration, refetch }) => <Translations key={celebration.version} celebration={celebration} refetch={refetch} saved={saved} onSaved={setSaved} />}
    </CelebrationScreen>
  );
}
