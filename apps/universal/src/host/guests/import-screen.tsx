import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useImportGuests, type CsvReport } from "@rsvp/query-hooks";
import { canPickTextFile, pickTextFile } from "../../platform/files";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, ErrorNotice, Field, Notice, Section, styles } from "../ui";

/** C21 · CSV import. Valid rows go in, invalid rows come back with their line number and reason (REQ-F16-03). */

export const MAX_CSV_BYTES = 1024 * 1024;

export function ImportReport({ report }: { readonly report: CsvReport }): ReactNode {
  const t = useT();
  return (
    <Section title={t("guests.import.result")}>
      <Text testID="import-summary" accessibilityLiveRegion="polite" style={styles.body}>{t("guests.import.summary", { imported: report.importedCount, failed: report.failedCount, total: report.totalRows })}</Text>
      {report.errors.length === 0 ? <Notice kind="success">{t("guests.import.none")}</Notice> : (
        <View style={{ gap: spacing[2] }}>
          <Text accessibilityRole="header" style={styles.label}>{t("guests.import.errorsTitle")}</Text>
          {report.importedCount > 0 ? <Text style={styles.body}>{t("guests.import.retryFailed")}</Text> : null}
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
  const alreadyImported = Boolean(run.data?.importedCount && run.variables === csv);

  const choose = async (): Promise<void> => {
    try {
      const file = await pickTextFile();
      if (!file) return;
      if (file.size > MAX_CSV_BYTES) { setProblem(t("guests.import.fileTooBig")); return; }
      setProblem(""); setCsv(file.text);
    } catch {
      setProblem(t("guests.import.fileReadError"));
    }
  };
  const submit = (): void => {
    if (run.isPending || alreadyImported) return;
    if (!csv.trim()) { setProblem(t("guests.import.empty")); return; }
    setProblem("");
    run.mutate(csv);
  };
  return (
    <View style={{ gap: spacing[4] }}>
      <Section title={t("guests.import.title")}>
        <Text style={styles.body}>{t("guests.import.intro")}</Text>
        <Text selectable style={[styles.body, { fontFamily: "monospace" }]}>{t("guests.import.header")}</Text>
        <Text style={styles.muted}>{t("guests.import.headerNote")}</Text>
        {canPickTextFile ? <ActionButton variant="secondary" label={t("guests.import.chooseFile")} disabled={run.isPending} onPress={() => { void choose(); }} /> : null}
        <Field label={t("guests.import.csvLabel")} multiline value={csv} onChange={(value) => { setCsv(value); setProblem(""); }} error={problem || undefined} testID="csv-input" />
        <ErrorNotice error={run.error} />
        <ActionButton label={run.isPending ? t("guests.import.running") : t("guests.import.run")} busy={run.isPending} disabled={alreadyImported} onPress={submit} testID="run-import" />
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
