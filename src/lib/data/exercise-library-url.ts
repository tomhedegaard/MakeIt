/**
 * The library's filter state lives in the URL (?q=&category=&equipment=)
 * so a filtered view can be shared and the page stays server-rendered.
 */

export type LibraryQuery = {
  q?: string | null;
  category?: string | null;
  equipment?: string | null;
};

const LIBRARY_PATH = "/train/exercises";

type RawParam = string | string[] | undefined;
const first = (raw: RawParam) => (Array.isArray(raw) ? raw[0] : raw);

/** The library URL for a filter state. Empty values are left out. */
export function libraryHref(query: LibraryQuery = {}): string {
  const params = new URLSearchParams();
  const q = query.q?.trim();
  if (q) params.set("q", q);
  if (query.category) params.set("category", query.category);
  if (query.equipment) params.set("equipment", query.equipment);
  const search = params.toString();
  return search ? `${LIBRARY_PATH}?${search}` : LIBRARY_PATH;
}

/**
 * Search text as the page uses it: trimmed, at most 80 characters,
 * undefined when blank. `*` is dropped: PostgREST reads it as a
 * wildcard in ilike and has no escape for it.
 */
export function normalizeSearch(raw: RawParam): string | undefined {
  return first(raw)?.replaceAll("*", "").trim().slice(0, 80) || undefined;
}

/** A category or equipment filter is honoured only when some published exercise has that value. */
export function pickFacet(raw: RawParam, available: readonly string[]): string | undefined {
  const value = first(raw);
  return value && available.includes(value) ? value : undefined;
}
