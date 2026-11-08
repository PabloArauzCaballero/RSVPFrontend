import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Enter, StickyActions, fonts } from "@rsvp/ui";
import { useImportGuests, type CsvReport } from "@rsvp/query-hooks";
import { canPickTextFile, pickTextFile } from "../../platform/files";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Celebrate, Field, useStyles } from "../ui";
import { FailureNotice, TextAction } from "./parts";
import { useSingleFlightGate } from "../../platform/single-flight";
import { csvLimitProblem, MAX_CSV_BYTES } from "./csv-limits";
import { isImportField, reasonKey } from "./import-reasons";

/** C21 · CSV import. Valid rows go in, invalid rows come back with their line number and reason (REQ-F16-03). */

export { MAX_CSV_BYTES };

export function ImportReport({ report }: { readonly report: CsvReport }): ReactNode {
  const styles = useStyles();
  const t = useT();
  return (
    <Enter from="down"><View style={{ gap: spacing[4] }}>
      <Text testID="import-summary" accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.subtitle}>{t("guests.import.summary", { imported: report.importedCount, failed: report.failedCount, total: report.totalRows })}</Text>
      {report.errors.length === 0 ? <Celebrate title={t("guests.import.celebrateTitle")} body={t("guests.import.celebrateBody")} /> : (
        <View style={{ gap: spacing[2] }}>
          <Text accessibilityRole="header" style={styles.label}>{t("guests.import.errorsTitle")}</Text>
          {report.errors.map((error) => (
            <View key={`${error.line}-${error.field}-${error.reason}`} testID={`import-error-${error.line}`} accessible style={[styles.notice, styles.noticeError]}>
              <Text style={styles.label}>{t("guests.import.line", { line: error.line })} · {t("guests.import.field", { field: isImportField(error.field) ? t(`guests.import.fields.${error.field}`) : error.field })}</Text>
              <Text style={styles.body}>{t(`guests.import.reasons.${reasonKey(error.reason)}`)}</Text>
            </View>
          ))}
        </View>
      )}
    </View></Enter>
  );
}

function ImportBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const run = useImportGuests(client, celebrationId);
  const [csv, setCsv] = useState("");
  const [problem, setProblem] = useState("");
  const flight = useSingleFlightGate();

  const choose = async (): Promise<void> => {
    const file = await pickTextFile();
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) { setProblem(t("guests.import.fileTooBig")); return; }
    setProblem(""); setCsv(file.text);
  };
  const submit = (): void => {
    if (!csv.trim()) { setProblem(t("guests.import.empty")); return; }
    const limit = csvLimitProblem(csv);
    if (limit) { setProblem(t(`guests.import.${limit}`)); return; }
    if (!flight.begin()) return;
    setProblem("");
    run.mutate(csv, { onSettled: flight.end });
  };
  return (
    <View style={{ gap: spacing[4] }}>
      {run.data ? (
        <>
          <ImportReport report={run.data} />
          <View style={styles.row}>
            <ActionButton label={t("guests.import.viewList")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebrationId))} />
            <ActionButton variant="secondary" label={t("guests.import.again")} onPress={() => { run.reset(); setCsv(""); }} />
          </View>
        </>
      ) : (
        <View style={[styles.card, { maxWidth: 720 }]}>
          <Text style={styles.body}>{t("guests.import.steps")}</Text>
          <Text selectable style={[styles.body, { fontFamily: fonts.mono, fontWeight: "600" }]}>{t("guests.import.header")}</Text>
          <Text style={styles.muted}>{t("guests.import.headerNote")}</Text>
          {canPickTextFile ? <ActionButton variant="secondary" label={t("guests.import.chooseFile")} onPress={() => { void choose(); }} /> : null}
          <Field label={t("guests.import.csvLabel")} multiline value={csv} onChange={(value) => { setCsv(value); setProblem(""); }} error={problem || undefined} testID="csv-input" />
          <FailureNotice error={run.error} onRetry={submit} />
        </View>
      )}
      {run.data ? null : (
        <StickyActions>
          <ActionButton label={run.isPending ? t("guests.import.running") : t("guests.import.run")} busy={run.isPending} onPress={submit} testID="run-import" />
          <TextAction label={t("guests.form.back")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebrationId))} />
        </StickyActions>
      )}
    </View>
  );
}

export function ImportGuestsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="guests" title={t("guests.import.title")} intro={t("guests.import.intro")}>{({ celebration }) => <ImportBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
