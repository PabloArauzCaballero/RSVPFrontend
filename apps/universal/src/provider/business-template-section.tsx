import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { TEMPLATE_MAX, unknownTemplateVariables, useSaveWhatsappTemplate, useWhatsappTemplate, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, Section, SuccessNote, useStyles } from "../host/ui";
import { PortalErrorNotice } from "./errors";
import { RowsSkeleton } from "./parts";
import { SheetErrorNotice } from "./product-editor/sheet-errors";
import { WhatsappTemplateField } from "./product-editor/whatsapp-template-field";

/** The sample product of the preview (§5.8: sample data only, never a real guest or celebration). */
const SAMPLE_PRICE_MINOR = 35_000;

type Problem = "empty" | "long" | "variables";
function problemOf(own: boolean, value: string): Problem | null {
  if (!own) return null;
  if (!value.trim()) return "empty";
  if (value.length > TEMPLATE_MAX) return "long";
  return unknownTemplateVariables(value).length ? "variables" : null;
}

/**
 * §5.8 · The business's WhatsApp message (`PUT /providers/{id}/whatsapp-template`): every product without a message of its own
 * uses it, and without it the DOne message. Turning the switch off and saving clears it (`template: null`). The server stays the
 * judge (422 UNKNOWN_TEMPLATE_VARIABLE, CONTACT_IN_TEXT with {field, fragment}); the redirector resolves it in R5.
 */
export function BusinessTemplateSection({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const locale = useLocale();
  const client = useApiClient();
  const query = useWhatsappTemplate(client, provider.id);
  const save = useSaveWhatsappTemplate(client, provider.id);
  const [own, setOwn] = useState(false);
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const loaded = useRef(false);

  // The form starts from what is stored, once: a later refetch never overwrites what the person is typing.
  useEffect(() => {
    if (loaded.current || !query.data) return;
    loaded.current = true;
    const stored = query.data.template?.["es-BO"] ?? "";
    setOwn(Boolean(stored));
    setValue(stored);
  }, [query.data]);

  const change = (next: Partial<{ own: boolean; value: string }>): void => {
    if (next.own !== undefined) setOwn(next.own);
    if (next.value !== undefined) setValue(next.value);
    setProblem(null);
    if (save.isSuccess || save.isError) save.reset();
  };
  const submit = (): void => {
    if (save.isPending) return;
    const found = problemOf(own, value);
    setProblem(found);
    if (found) return;
    save.mutate(own ? { "es-BO": value.trim() } : null);
  };

  const body = (() => {
    if (query.isPending) return <RowsSkeleton count={2} minHeight={64} />;
    if (query.isError) return <PortalErrorNotice error={query.error} onRetry={() => { void query.refetch(); }} />;
    const sample = { producto: t("portal.destinations.template.sampleProduct"), version: t("portal.destinations.template.sampleVersion"), precio: formatMinor(SAMPLE_PRICE_MINOR, "BOB", locale), proveedor: provider.name };
    return (
      <>
        <WhatsappTemplateField own={own} value={value} fallback={query.data.defaultTemplate["es-BO"] ?? ""} fallbackIsProvider={false} sample={sample} heading={false}
          ownLabel={t("portal.destinations.template.useOwn")} disabled={save.isPending}
          {...(problem && problem !== "variables" ? { error: t(`portal.destinations.template.${problem}`) } : {})}
          onOwn={(next) => change({ own: next })} onChange={(next) => change({ value: next })} />
        <View style={{ alignSelf: "flex-start" }}>
          <ActionButton variant="secondary" icon="check" label={save.isPending ? t("portal.destinations.template.saving") : t("portal.destinations.template.save")} busy={save.isPending} disabled={save.isPending} onPress={submit} testID="business-template-save" />
        </View>
        {save.isSuccess ? <SuccessNote message={t(save.data.template ? "portal.destinations.template.saved" : "portal.destinations.template.cleared")} /> : null}
        <SheetErrorNotice error={save.error} onRetry={submit} />
      </>
    );
  })();

  return (
    <Section title={t("portal.destinations.template.title")}>
      <View style={{ gap: spacing[3] }} testID="business-template">
        <Text style={styles.body}>{t("portal.destinations.template.intro")}</Text>
        {body}
      </View>
    </Section>
  );
}
