import taxonomy from "./exercise-taxonomy.json";

export type TaxonomyGroup = keyof typeof taxonomy;

/**
 * The catalogue's enums in display order. One source for the coach
 * editor, the library filters, the label tests and the MoveKit scripts
 * (which read the JSON file directly). The database has no check
 * constraints on these columns, so a value outside the lists can still
 * appear; callers treat it as "unknown" rather than invalid.
 */
export const TAXONOMY: Record<TaxonomyGroup, readonly string[]> = taxonomy;

/** Unique values in taxonomy order; values the taxonomy does not know come last, alphabetically. */
export function orderByTaxonomy(group: TaxonomyGroup, values: Iterable<string>): string[] {
  const present = new Set(values);
  const order = TAXONOMY[group];
  const known = order.filter((v) => present.has(v));
  const unknown = [...present].filter((v) => !order.includes(v)).sort((a, b) => a.localeCompare(b));
  return [...known, ...unknown];
}

export type CategoryGroup<T> = { category: string | null; items: T[] };

/**
 * Items bucketed by category for a grouped picker: taxonomy order,
 * unknown categories after the known ones, uncategorised last. Items
 * are sorted by name inside each group. The input is not mutated.
 */
export function groupByCategory<T extends { name: string; category: string | null }>(
  items: readonly T[],
): CategoryGroup<T>[] {
  const buckets = new Map<string | null, T[]>();
  for (const item of items) {
    const key = item.category || null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  const named = orderByTaxonomy(
    "categories",
    [...buckets.keys()].filter((k): k is string => k !== null),
  );
  const groups: CategoryGroup<T>[] = named.map((category) => ({
    category,
    items: [...(buckets.get(category) ?? [])].sort(byName),
  }));
  const uncategorised = buckets.get(null);
  if (uncategorised) groups.push({ category: null, items: [...uncategorised].sort(byName) });
  return groups;
}
