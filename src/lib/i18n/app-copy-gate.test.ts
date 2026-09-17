import { readFileSync } from "node:fs";
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
});
