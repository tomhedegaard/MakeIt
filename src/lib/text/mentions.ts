/**
 * @mention parsing.
 *
 * Handles match the existing handle convention used elsewhere:
 *   - First char: letter
 *   - Following: letters, digits, _, ., -
 *   - Length 2-31 (matches public.members handle constraints in spirit)
 *
 * Examples that match:  @Munk  @nina_dl  @maria.lift  @kasper_s
 * Examples that don't:  @1abc  @x  email-like name@host.com (the @ is preceded by a word char)
 */

const MENTION_RE = /(^|[^\w])@([a-zA-Z][a-zA-Z0-9_.-]{1,30})/g;

/**
 * Return the unique set of handles mentioned in `text` (without the
 * leading @). Order is insertion order. Lowercased — handles in DB are
 * stored case-insensitively per the lower() bootstrap, but we keep
 * original casing in the rendered output.
 */
export function extractMentions(text: string): string[] {
  const seen = new Set<string>();
  if (!text) return [];
  for (const match of text.matchAll(MENTION_RE)) {
    const handle = match[2];
    seen.add(handle);
  }
  return Array.from(seen);
}

export type RenderedPart =
  | { kind: "text"; value: string }
  | { kind: "mention"; handle: string };

/**
 * Split text into renderable parts so callers can style mentions
 * differently (typically with a brighter color / weight).
 */
export function renderMentions(text: string): RenderedPart[] {
  if (!text) return [];
  const parts: RenderedPart[] = [];
  let last = 0;

  for (const match of text.matchAll(MENTION_RE)) {
    const idx = (match.index ?? 0) + match[1].length; // skip the leading non-word char
    if (idx > last) parts.push({ kind: "text", value: text.slice(last, idx) });
    parts.push({ kind: "mention", handle: match[2] });
    last = idx + 1 + match[2].length; // "@" + handle
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}
