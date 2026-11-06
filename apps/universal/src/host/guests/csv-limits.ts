/** Contract limits of POST .../guests/import: up to 1000 data rows and 1 MiB. Checked before sending so the person never waits for a refusal we can predict. */
export const MAX_CSV_BYTES = 1024 * 1024;
export const MAX_CSV_ROWS = 1000;

const encoder = new TextEncoder();

/** Records in the text, honouring quoted fields (a newline inside quotes does not start a new record) and ignoring blank lines. */
export function countCsvRecords(csv: string): number {
  let records = 0;
  let inQuotes = false;
  let hasContent = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') { inQuotes = !inQuotes; hasContent = true; continue; }
    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      if (hasContent) records += 1;
      hasContent = false;
      continue;
    }
    if (char !== " " && char !== "\t") hasContent = true;
  }
  return hasContent ? records + 1 : records;
}

/** Which limit the text breaks, if any. The header record is not a data row. */
export function csvLimitProblem(csv: string): "fileTooBig" | "tooManyRows" | null {
  if (encoder.encode(csv).length > MAX_CSV_BYTES) return "fileTooBig";
  return countCsvRecords(csv) - 1 > MAX_CSV_ROWS ? "tooManyRows" : null;
}
