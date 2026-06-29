/** Sentinel for a gap between page numbers, rendered as an ellipsis. */
export const PAGE_GAP = "gap" as const;

export type PageItem = number | typeof PAGE_GAP;

/**
 * Builds a compact pager window: first and last page are always shown, with the
 * current page flanked by `siblings` neighbours and gaps collapsing the rest.
 */
export function paginationRange(page: number, totalPages: number, siblings = 1): PageItem[] {
  if (totalPages <= 1) return [1];

  const first = 1;
  const last = totalPages;
  const start = Math.max(first, page - siblings);
  const end = Math.min(last, page + siblings);

  const items: PageItem[] = [];
  items.push(first);
  if (start > first + 1) items.push(PAGE_GAP);
  for (let p = Math.max(first + 1, start); p <= Math.min(last - 1, end); p += 1) items.push(p);
  if (end < last - 1) items.push(PAGE_GAP);
  if (last !== first) items.push(last);

  return items;
}
