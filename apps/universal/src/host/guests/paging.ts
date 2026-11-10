/** Offset of the last page that has rows (0 when the list is empty), for stepping back when a page disappears. */
export function lastPageOffset(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.floor((total - 1) / pageSize) * pageSize;
}
