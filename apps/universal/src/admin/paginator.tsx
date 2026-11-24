import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { ActionButton, useStyles } from "../host/ui";

/**
 * Server-side pagination (zero-based `page`): "21-40 de 132", the page number, and Previous / Next that disable at the ends.
 * A labelled navigation landmark, so a screen reader can jump to it. Renders nothing while there is a single page and nothing to say.
 */
export function Paginator({ page, pageSize, total, onChange, disabled = false, testID = "paginator" }: {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onChange: (page: number) => void;
  /** While the next page loads: the buttons wait, the numbers stay. */
  readonly disabled?: boolean;
  readonly testID?: string;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <View role="navigation" aria-label={t("admin.table.pagination")} testID={testID} style={[styles.row, { justifyContent: "space-between", gap: spacing[3] }]}>
      <Text role="status" style={styles.muted} testID={`${testID}-range`}>{t("admin.table.range", { from, to, total })}</Text>
      {pages > 1 ? (
        <View style={[styles.row, { gap: spacing[2] }]}>
          <ActionButton icon="back" variant="secondary" label={t("admin.table.prev")} disabled={disabled || page === 0} onPress={() => onChange(Math.max(0, page - 1))} testID={`${testID}-prev`} />
          <Text style={styles.body} testID={`${testID}-page`}>{t("admin.table.page", { page: page + 1, pages })}</Text>
          <ActionButton icon="arrow" variant="secondary" label={t("admin.table.next")} disabled={disabled || page + 1 >= pages} onPress={() => onChange(Math.min(pages - 1, page + 1))} testID={`${testID}-next`} />
        </View>
      ) : null}
    </View>
  );
}
