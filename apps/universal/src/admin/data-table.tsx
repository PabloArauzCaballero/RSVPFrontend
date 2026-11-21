import type { ReactNode } from "react";
import { Platform, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { PressFeedback, useColors, type IllustrationName } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { EmptyState, FilterSelect, useStyles } from "../host/ui";
import { RowsSkeleton } from "../provider/parts";
import { AdminListError } from "./shared";

/** From this width (web) the rows are a real table; below it, and always on native, each row is a card. */
export const TABLE_FROM = 900;
const CELL_MIN = 96;
const ACTIONS_WIDTH = 64;
const ARROW = 6;

export interface DataColumn<TRow> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: TRow) => ReactNode;
  /** The server sort this column applies when its header is pressed (each column sorts one way: the server offers one direction). */
  readonly sort?: { readonly value: string; readonly direction: "ascending" | "descending" };
  /** Relative width in the table; 1 by default. */
  readonly flex?: number;
  /** The column that names the row: the title of its card. */
  readonly primary?: boolean;
}

export interface DataTableProps<TRow> {
  /** Accessible name of the table ("Partners"). */
  readonly label: string;
  readonly columns: readonly DataColumn<TRow>[];
  readonly rows: readonly TRow[] | undefined;
  readonly rowKey: (row: TRow) => string;
  /** Actions of a row (an overflow menu), in the last cell or at the foot of the card. */
  readonly actions?: (row: TRow) => ReactNode;
  readonly sort?: string;
  readonly onSort?: (value: string) => void;
  readonly loading: boolean;
  /** A refetch with rows already on screen (a new page, a new filter): the rows stay and a quiet line says it is updating. */
  readonly refreshing?: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly emptyAction?: ReactNode;
  readonly illustration?: IllustrationName;
  readonly testID?: string;
}

/**
 * The admin's data table: loading (row skeletons), error (the kind of failure with a retry), empty (what to do next) and data.
 * Web from 900 px: `role=table` with column headers; a sortable header is a button and the header carries `aria-sort`.
 * Narrower, and on native: one card per row (the primary column as title, the rest as label/value pairs) and the sort as a picker.
 */
export function DataTable<TRow>({ label, columns, rows, rowKey, actions, sort, onSort, loading, refreshing = false, error, onRetry, emptyTitle, emptyBody, emptyAction, illustration = "emptySearch", testID = "data-table" }: DataTableProps<TRow>): ReactNode {
  const t = useT();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const table = Platform.OS === "web" && width >= TABLE_FROM;
  if (loading && !rows) return <RowsSkeleton count={5} minHeight={table ? 56 : 120} />;
  if (error && !rows) return <AdminListError error={error} onRetry={onRetry} retryTestID={`${testID}-retry`} />;
  if (!rows || rows.length === 0) return <EmptyState illustration={illustration} title={emptyTitle} body={emptyBody} {...(emptyAction ? { action: emptyAction } : {})} />;
  const sortable = columns.filter((column) => column.sort);
  return (
    <View style={{ gap: spacing[3] }} testID={testID}>
      {refreshing ? <Text role="status" style={styles.muted}>{t("admin.table.updating")}</Text> : null}
      {error ? <AdminListError error={error} onRetry={onRetry} retryTestID={`${testID}-retry`} /> : null}
      {table ? <Table label={label} columns={columns} rows={rows} rowKey={rowKey} actions={actions} sort={sort} onSort={onSort} testID={testID} /> : (
        <>
          {sortable.length && onSort ? (
            <View style={{ gap: spacing[1], alignSelf: "flex-start" }}>
              <Text style={styles.label}>{t("admin.table.sortBy")}</Text>
              <FilterSelect label={t("admin.table.sortBy")} value={sort ?? sortable[0]?.sort?.value ?? ""} onChange={onSort} options={sortable.map((column) => ({ value: column.sort?.value ?? "", label: t(`admin.table.sortOption.${column.sort?.direction ?? "ascending"}`, { column: column.header }) }))} testID={`${testID}-sort`} />
            </View>
          ) : null}
          <Cards label={label} columns={columns} rows={rows} rowKey={rowKey} actions={actions} testID={testID} />
        </>
      )}
    </View>
  );
}

function SortArrow({ direction, active }: { readonly direction: "ascending" | "descending"; readonly active: boolean }): ReactNode {
  const palette = useColors();
  return <View aria-hidden style={{ width: ARROW, height: ARROW, marginTop: direction === "ascending" ? 3 : -3, borderLeftWidth: 1.5, borderTopWidth: 1.5, borderColor: active ? palette.text : palette.textMuted, transform: [{ rotate: direction === "ascending" ? "45deg" : "225deg" }] }} />;
}

function Table<TRow>({ label, columns, rows, rowKey, actions, sort, onSort, testID }: Pick<DataTableProps<TRow>, "label" | "columns" | "rowKey" | "actions" | "sort" | "onSort"> & { readonly rows: readonly TRow[]; readonly testID: string }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const minWidth = columns.reduce((sum, column) => sum + CELL_MIN * (column.flex ?? 1), actions ? ACTIONS_WIDTH : 0) + spacing[4] * 2;
  const cell = (flex = 1) => ({ flex, minWidth: CELL_MIN * flex, paddingHorizontal: spacing[2], justifyContent: "center" as const });
  return (
    <ScrollView horizontal tabIndex={0} aria-label={label} style={{ borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, backgroundColor: palette.surface }} contentContainerStyle={{ minWidth: "100%" }}>
      <View role="table" aria-label={label} aria-rowcount={rows.length + 1} style={{ minWidth, flex: 1 }} testID={`${testID}-table`}>
        <View role="row" style={{ flexDirection: "row", paddingHorizontal: spacing[2], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surfaceMuted }}>
          {columns.map((column) => {
            const active = column.sort !== undefined && column.sort.value === sort;
            const ariaSort = active ? column.sort?.direction : column.sort ? "none" : undefined;
            return (
              <View key={column.key} role="columnheader" {...(ariaSort ? { "aria-sort": ariaSort } : {})} style={cell(column.flex)}>
                {column.sort && onSort ? (
                  <PressFeedback accessibilityRole="button" accessibilityLabel={t("admin.table.sortAction", { column: column.header })} onPress={() => onSort(column.sort?.value ?? "")} testID={`${testID}-sort-${column.key}`} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                    <Text style={[styles.label, active ? null : { color: palette.textMuted }]}>{column.header}</Text>
                    <SortArrow direction={column.sort.direction} active={active} />
                  </PressFeedback>
                ) : <Text style={[styles.label, { color: palette.textMuted, minHeight: 44, textAlignVertical: "center", paddingTop: spacing[3] } as object]}>{column.header}</Text>}
              </View>
            );
          })}
          {actions ? <View role="columnheader" style={{ width: ACTIONS_WIDTH }}><Text style={[styles.label, { color: palette.textMuted, paddingTop: spacing[3] }]}>{t("admin.table.actions")}</Text></View> : null}
        </View>
        {rows.map((row, index) => (
          <View key={rowKey(row)} role="row" testID={`${testID}-row-${rowKey(row)}`} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing[2], paddingVertical: spacing[3], borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: palette.border }}>
            {columns.map((column) => <View key={column.key} role={column.primary ? "rowheader" : "cell"} style={cell(column.flex)}>{asNode(column.render(row), styles.body)}</View>)}
            {actions ? <View role="cell" style={{ width: ACTIONS_WIDTH, alignItems: "flex-end" }}>{actions(row)}</View> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Cards<TRow>({ label, columns, rows, rowKey, actions, testID }: Pick<DataTableProps<TRow>, "label" | "columns" | "rowKey" | "actions"> & { readonly rows: readonly TRow[]; readonly testID: string }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const primary = columns.find((column) => column.primary) ?? columns[0];
  return (
    <View role="list" aria-label={label} style={{ gap: spacing[3] }}>
      {rows.map((row) => (
        <View key={rowKey(row)} role="listitem" testID={`${testID}-card-${rowKey(row)}`} style={{ borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, backgroundColor: palette.surface, padding: spacing[4], gap: spacing[3] }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing[3] }}>
            <View style={{ flex: 1, minWidth: 0 }}>{primary ? asNode(primary.render(row), styles.itemTitle) : null}</View>
            {actions ? actions(row) : null}
          </View>
          {columns.filter((column) => column !== primary).map((column) => (
            <View key={column.key} style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2], alignItems: "center" }}>
              <Text style={[styles.muted, { minWidth: 112 }]}>{column.header}</Text>
              <View style={{ flex: 1, minWidth: 140 }}>{asNode(column.render(row), styles.body)}</View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Plain strings get the text style of the place they land in; anything else renders as given. */
function asNode(content: ReactNode, style: object): ReactNode {
  return typeof content === "string" || typeof content === "number" ? <Text style={[style, { overflowWrap: "anywhere" } as object]}>{content}</Text> : content;
}
