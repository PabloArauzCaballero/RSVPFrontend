import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { supportedLocales } from "@rsvp/i18n";
import { useEditCelebration, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { asRecord, asRecords, asText, scheduleDraft } from "./content-draft";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LIMITS, overLimit } from "./limits";
import { ActionButton, ChoiceGroup, Field, Notice, Section, styles } from "./ui";

/** C13 · The same content in each language of the site (REQ-F11-03). Times are never translated. */

const TEXT_FIELDS = ["title", "subtitle", "story", "dressCode"] as const;
type Overrides = Record<string, unknown>;

export function translatableLocales(celebration: Pick<Celebration, "supportedLocales" | "defaultLocale">): string[] {
  return celebration.supportedLocales.filter((locale) => locale !== celebration.defaultLocale);
}

function Translations({ celebration, refetch, onSaved }: { readonly celebration: Celebration; readonly refetch: () => void; readonly onSaved: (saved: boolean) => void }): ReactNode {
  const t = useT();
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

  const tooLong = Object.values(current).some((value) => typeof value === "string" && overLimit(value, LIMITS.translation) !== null);
  const save = (): void => {
    if (!locale || tooLong) return;
    onSaved(false);
    const cleaned = Object.fromEntries(Object.entries(current).filter(([, value]) => (typeof value === "string" ? value.trim() : value !== undefined)));
    once((release) => { mutation.mutateAsync({ target: celebration, patch: { translations: { [locale]: Object.keys(cleaned).length ? cleaned : null } } }).then(() => onSaved(true), () => undefined).finally(release); });
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={styles.muted}>{t("host.translations.help")}</Text>
      {missing.length ? (
        <View style={styles.row}>
          {missing.map((code) => (
            <ActionButton key={code} variant="secondary" label={`${t("host.translations.addLanguage")}: ${t(`celebration.language.${code}`)}`} busy={mutation.isPending}
              onPress={() => mutation.mutate({ target: celebration, patch: { supportedLocales: [...celebration.supportedLocales, code] } }, { onSuccess: refetch })} />
          ))}
        </View>
      ) : null}
      {!locales.length ? <Notice>{t("host.translations.noLanguages")}</Notice> : (
        <>
          <ChoiceGroup label={t("host.translations.language")} value={locale} onChange={setLocale} choices={locales.map((code) => ({ value: code, label: t(`celebration.language.${code}`) }))} />
          <Section title={t(`celebration.language.${locale ?? ""}`)}>
            {TEXT_FIELDS.map((field) => (
              <Field key={field} label={t(`host.translations.fields.${field}`)} value={asText(current[field])} onChange={(value) => set(field, value)} multiline={field === "story"} {...(overLimit(asText(current[field]), LIMITS.translation) !== null ? { error: t("host.limits.tooLong", { count: overLimit(asText(current[field]), LIMITS.translation) ?? 0, max: LIMITS.translation }) } : {})}
                help={asText(celebration.content[field]) ? t("host.translations.original", { text: asText(celebration.content[field]) }) : undefined} />
            ))}
            {faq.map((item, index) => (
              <View key={`faq-${index}`} style={{ gap: 8 }}>
                <Text style={styles.label}>{t("host.translations.faqItem", { n: index + 1 })}</Text>
                {(["question", "answer"] as const).map((part) => (
                  <Field key={part} label={t(`host.editor.extra.${part}`)} value={asText(faqDraft[index]?.[part])} help={t("host.translations.original", { text: asText(item[part]) })}
                    onChange={(value) => set("faq", faq.map((original, position) => ({ question: asText(faqDraft[position]?.["question"]), answer: asText(faqDraft[position]?.["answer"]), ...(position === index ? { [part]: value } : {}) })))} />
                ))}
              </View>
            ))}
            {scheduleDraft(celebration).map((item, index) => (
              <Field key={item.id} label={t("host.translations.scheduleItem", { n: index + 1 })} value={asText(asRecord(labels[item.id])["title"])} help={t("host.translations.original", { text: item.title })}
                onChange={(value) => set("scheduleLabels", { ...labels, [item.id]: { title: value } })} />
            ))}
          </Section>
          <CelebrationErrorNotice error={mutation.error} onReload={refetch} />
          <ActionButton label={mutation.isPending ? t("host.common.saving") : t("host.common.save")} busy={mutation.isPending} disabled={tooLong} onPress={save} testID="save-translation" />
        </>
      )}
    </View>
  );
}

export function TranslationEditorScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  // The form restarts from the stored content after each save (keyed by version), so the confirmation lives here.
  const [saved, setSaved] = useState(false);
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="translations" editable title={t("host.translations.title")}>
      {({ celebration, refetch }) => <>{saved ? <Notice kind="success">{t("host.common.saved")}</Notice> : null}<Translations key={celebration.version} celebration={celebration} refetch={refetch} onSaved={setSaved} /></>}
    </CelebrationScreen>
  );
}
