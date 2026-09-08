import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("session chrome at 390px", () => {
  it("hydrates TODAY_SESSION library in the demo page path", () => {
    const src = readFileSync(join(here, "page.tsx"), "utf8");
    expect(src).toContain("hydrateDemoSessionLibrary");
    expect(src).toContain("TODAY_SESSION");
  });

  it("lets the film CTA wrap instead of clipping Film →", () => {
    const src = readFileSync(join(here, "SessionClient.tsx"), "utf8");
    const film = src.slice(
      src.indexOf("data-form-film-cta"),
      src.indexOf("<FormCheckThread"),
    );
    expect(film).toContain("flex-1 min-w-0");
    expect(film).toContain("break-words");
    expect(film).toContain("overflow-x-clip");
    expect(film).not.toMatch(/className="btn/);
    expect(film).not.toContain("whitespace-nowrap");
    expect(film).not.toContain("truncate");
  });

  it("clears the log-set dock and rest overlay", () => {
    const src = readFileSync(join(here, "SessionClient.tsx"), "utf8");
    expect(src).toContain("px-4");
    expect(src).toContain("pb-40");
    expect(src).toContain("pb-52");
    expect(src).toContain('bottom: "calc(env(safe-area-inset-bottom, 0px) + 112px)"');
  });

  it("renders a compact demo loop without replacing the film CTA", () => {
    const src = readFileSync(join(here, "SessionClient.tsx"), "utf8");
    expect(src).toContain("SessionExerciseDemo");
    expect(src).toContain("resolveSessionDemoAssetUrl");
    expect(src).toContain("data-form-film-cta");
    expect(src).toContain("onOpenFormCheck");
    // Library loop and member camera upload stay separate features.
    const film = src.slice(
      src.indexOf("data-form-film-cta"),
      src.indexOf("<FormCheckThread"),
    );
    expect(film).not.toContain("SessionExerciseDemo");
    expect(film).not.toContain("<video");
  });

  it("wraps rest copy instead of truncating it", () => {
    const src = readFileSync(
      join(here, "../../../../components/ui/RestTimer.tsx"),
      "utf8",
    );
    expect(src).toContain("minmax(0,1fr)");
    expect(src).toContain("whitespace-normal break-words");
    expect(src).toContain("data-rest-timer");
    expect(src).not.toContain("truncate");
    expect(src).not.toContain("btn btn-sm");
  });
});

describe("session i18n chrome (Testy LOW)", () => {
  it("keeps Danish session CTAs out of English leftovers", async () => {
    const da = await import("../../../../../messages/da/Session.json");
    expect(da.default.preview.start).toBe("Start sessionen");
    expect(da.default.restTimer.skip).toBe("Spring over");
    expect(da.default.exercise.duration).toBe("Optag →");
    expect(da.default.exercise.formCheck).toMatch(/^Optag sæt/);
    expect(da.default.exercise.thread.pending).toMatch(/coach Munk/i);
    expect(da.default.exercise.thread.reviewed).toMatch(/Coach Munk/);
    expect(da.default.done.eyebrow).toBe("Session færdig");
  });
});
