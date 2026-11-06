import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useImportGuests, type CsvReport } from "@rsvp/query-hooks";
import { canPickTextFile, pickTextFile } from "../../platform/files";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Field, Notice, Section, styles } from "../ui";
import { FailureNotice } from "./parts";
import { useSingleFlightGate } from "../../platform/single-flight";
import { csvLimitProblem, MAX_CSV_BYTES } from "./csv-limits";

/** C21 · CSV import. Valid rows go in, invalid rows come back with their line number and reason (REQ-F16-03). */

export { MAX_CSV_BYTES };

export function ImportReport({ report }: { readonly report: CsvReport }): ReactNode {
  const t = useT();
  return (
    <Section title={t("guests.import.result")}>
      <Text testID="import-summary" accessibilityLiveRegion="polite" style={styles.body}>{t("guests.import.summary", { imported: report.importedCount, failed: report.failedCount, total: report.totalRows })}</Text>
      {report.errors.length === 0 ? <Notice kind="success">{t("guests.import.none")}</Notice> : (
        <View style={{ gap: spacing[2] }}>
          <Text accessibilityRole="header" style={styles.label}>{t("guests.import.errorsTitle")}</Text>
          {report.errors.map((error) => (
            <View key={`${error.line}-${error.field}-${error.reason}`} testID={`import-error-${error.line}`} accessible style={[styles.notice, styles.noticeError]}>
              <Text style={styles.label}>{t("guests.import.line", { line: error.line })} · {t("guests.import.field", { field: error.field })}</Text>
              <Text style={styles.body}>{error.reason}</Text>
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}

function ImportBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
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
      <Section title={t("guests.import.title")}>
        <Text style={styles.body}>{t("guests.import.intro")}</Text>
        <Text selectable style={[styles.body, { fontFamily: "monospace" }]}>{t("guests.import.header")}</Text>
        <Text style={styles.muted}>{t("guests.import.headerNote")}</Text>
        {canPickTextFile ? <ActionButton variant="secondary" label={t("guests.import.chooseFile")} onPress={() => { void choose(); }} /> : null}
        <Field label={t("guests.import.csvLabel")} multiline value={csv} onChange={(value) => { setCsv(value); setProblem(""); }} error={problem || undefined} testID="csv-input" />
        <FailureNotice error={run.error} onRetry={submit} />
        <ActionButton label={run.isPending ? t("guests.import.running") : t("guests.import.run")} busy={run.isPending} onPress={submit} testID="run-import" />
      </Section>
      {run.data ? <ImportReport report={run.data} /> : null}
      {run.data ? <View style={styles.row}>
        <ActionButton variant="secondary" label={t("guests.import.again")} onPress={() => { run.reset(); setCsv(""); }} />
        <ActionButton label={t("guests.import.viewList")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebrationId))} />
      </View> : null}
    </View>
  );
}

export function ImportGuestsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="guests" title={t("guests.import.title")}>{({ celebration }) => <ImportBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
