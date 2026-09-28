import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Member-app namespaces. Marketing (classic landing; kalk has its own gate), Email, Legal
// and the coach console (Coach, CoachStudio) are out of scope for F4.
const APP_NAMESPACES = [
  "Adaptive", "Billing", "Buddy", "Coaching", "CoachSchool", "Common", "Community", "Dashboard",
  "FormCheck", "Hrv", "Language", "Login", "Messages", "Mind", "Misc", "Nav", "Nutrition",
  "Onboarding", "Profile", "ProgramDetail", "Push", "Reps", "Science", "Session", "Settings", "Train",
] as const;

const load = (l: string, ns: string) =>
  JSON.parse(readFileSync(new URL(`../../../messages/${l}/${ns}.json`, import.meta.url), "utf8"));

function entries(v: unknown, p = ""): [string, string][] {
  if (typeof v === "string") return [[p, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => entries(x, `${p}[${i}]`));
  if (!v || typeof v !== "object") return [];
  return Object.entries(v).flatMap(([k, x]) => entries(x, p ? `${p}.${k}` : k));
}

const all = (["da", "en"] as const).flatMap((l) =>
  APP_NAMESPACES.flatMap((ns) => entries(load(l, ns)).map(([k, s]) => [`${l}/${ns}:${k}`, s] as const)),
);

describe("app copy gate (spec §5 taste rules, §8)", () => {
  it("has no section numbers in eyebrows", () => {
    const bad = all.filter(([k, s]) => /eyebrow/i.test(k) && /^\s*\d{1,2}\s*[·—–-]/.test(s));
    expect(bad).toEqual([]);
  });

  it("has no em or en dashes", () => {
    const bad = all.filter(([, s]) => /[–—]/.test(s)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it("keeps da and en keys in lockstep", () => {
    for (const ns of APP_NAMESPACES) {
      const keys = (l: string) => entries(load(l, ns)).map(([k]) => k).sort();
      expect(keys("da"), ns).toEqual(keys("en"));
    }
  });
});

describe("no hardcoded copy in HRV and Mind (review finding)", () => {
  const SRC = fileURLToPath(new URL("../../", import.meta.url));
  const dirs = ["app/(app)/hrv", "app/(app)/mind", "components/hrv", "components/mind"];
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const files = dirs.flatMap((d) => walk(join(SRC, d))).filter((f) => f.endsWith(".tsx") && !f.includes(".test."));
  // JSX text: must follow a real tag (opening `<tag …>` or closing `</tag>`) and end at a tag,
  // so TS generics (`useState<X>(null)`) and ternaries (`: null; return (<`) don't match.
  // Text never starts with `)`: that is a JSX ternary branch (`<A />\n) : cond ? (\n<B`), not copy.
  const JSX_TEXT = /(?:<[a-zA-Z][\w.]*(?:\s[^<>]*)?>|<\/[\w.]+>)[ \t]*\n?[ \t]*[^<>{}\s)][^<>{}]*[A-Za-zÆØÅæøå]{3,}[^<>{}]*<\/?[a-zA-Z]/;
  const ATTR = /\b(aria-label|title|placeholder|alt|eyebrow|subtitle|label)="[^"]*[A-Za-zÆØÅæøå]{3,}[^"]*"/;
  // Metadata <title> with an id is a11y copy too; keep it in messages.
  it.each(files.map((f) => [f.slice(SRC.length), f]))("%s", (_n, f) => {
    const src = readFileSync(f, "utf8")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "") // JSX comments
      .replace(/\b\w+<[^<>()=]*>(?=\()/g, ""); // TS generics: useState<string | null>(
    expect(src).not.toMatch(JSX_TEXT);
    expect(src).not.toMatch(ATTR);
  });
});
