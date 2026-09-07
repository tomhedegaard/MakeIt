import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_DEMO_SLUGS,
  bundledDemoAssetUrl,
} from "@/lib/data/bundled-demo-assets";
import { resolveDemoAssets } from "@/lib/data/demo-assets";
import { MOCK_EXERCISES } from "@/lib/data/exercise-mocks";

const DEMO_DIR = join(process.cwd(), "public/exercise-demos");
const SEED_EXERCISES = readFileSync(
  join(process.cwd(), "supabase/seed-exercises.sql"),
  "utf8",
);
const SEED_MINI = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8");

function slugsOnDisk(): string[] {
  return readdirSync(DEMO_DIR)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => f.slice(0, -".webm".length))
    .sort();
}

function seedAssignsPublicPath(sql: string, slug: string): boolean {
  const inList = sql.includes(`'${slug}'`);
  const writesPublic =
    sql.includes("'/exercise-demos/' || slug || '.webm'") ||
    sql.includes(`'/exercise-demos/${slug}.webm'`);
  return inList && writesPublic;
}

describe("resolveDemoAssets", () => {
  it("derives mp4 + poster siblings from a public webm path", () => {
    expect(resolveDemoAssets("/exercise-demos/rdl.webm")).toEqual({
      webm: "/exercise-demos/rdl.webm",
      mp4: "/exercise-demos/rdl.mp4",
      poster: "/exercise-demos/rdl-poster.jpg",
    });
  });

  it("keeps a ?v= cache-bust on all three siblings (Storage upload)", () => {
    const url =
      "https://example.supabase.co/storage/v1/object/public/exercise-demos/pull-up.webm?v=99";
    expect(resolveDemoAssets(url)).toEqual({
      webm: "https://example.supabase.co/storage/v1/object/public/exercise-demos/pull-up.webm?v=99",
      mp4: "https://example.supabase.co/storage/v1/object/public/exercise-demos/pull-up.mp4?v=99",
      poster:
        "https://example.supabase.co/storage/v1/object/public/exercise-demos/pull-up-poster.jpg?v=99",
    });
  });

  it("also accepts an mp4 canonical URL", () => {
    expect(resolveDemoAssets("/exercise-demos/lunge.mp4")).toEqual({
      webm: "/exercise-demos/lunge.webm",
      mp4: "/exercise-demos/lunge.mp4",
      poster: "/exercise-demos/lunge-poster.jpg",
    });
  });
});

describe("bundled v1 demo loops", () => {
  const disk = slugsOnDisk();

  it("manifest matches every trio on disk (and nothing extra)", () => {
    expect([...BUNDLED_DEMO_SLUGS].sort()).toEqual(disk);
    for (const slug of disk) {
      expect(existsSync(join(DEMO_DIR, `${slug}.mp4`))).toBe(true);
      expect(existsSync(join(DEMO_DIR, `${slug}-poster.jpg`))).toBe(true);
    }
  });

  it("every on-disk slug has a non-null mock + seed public URL", () => {
    for (const slug of disk) {
      const url = `/exercise-demos/${slug}.webm`;
      expect(bundledDemoAssetUrl(slug)).toBe(url);

      const mock = MOCK_EXERCISES.find((e) => e.slug === slug);
      expect(mock, `missing mock for ${slug}`).toBeTruthy();
      expect(mock?.demoAssetUrl).toBe(url);

      expect(seedAssignsPublicPath(SEED_EXERCISES, slug), slug).toBe(true);
      expect(seedAssignsPublicPath(SEED_MINI, slug), `seed.sql ${slug}`).toBe(
        true,
      );
    }
  });

  it("front-squat (no files) stays null in mock, helper, and seed lists", () => {
    expect(disk).not.toContain("front-squat");
    expect(existsSync(join(DEMO_DIR, "front-squat.webm"))).toBe(false);
    expect(bundledDemoAssetUrl("front-squat")).toBeNull();

    const mock = MOCK_EXERCISES.find((e) => e.slug === "front-squat");
    expect(mock, "front-squat must exist in demo mock").toBeTruthy();
    expect(mock?.demoAssetUrl).toBeNull();

    // Seed inserts the row but the bundled-loop UPDATE must not include it.
    expect(SEED_EXERCISES).toMatch(/front-squat has no/);
    const updateStart = SEED_EXERCISES.lastIndexOf(
      "set demo_asset_url = '/exercise-demos/' || slug || '.webm'",
    );
    const updateBlock = SEED_EXERCISES.slice(updateStart);
    expect(updateBlock).not.toMatch(/'front-squat'/);
  });

  it("does not overwrite Storage URLs on seed (coach upload contract)", () => {
    expect(SEED_EXERCISES).toMatch(/demo_asset_url like '\/exercise-demos\/%'/);
    expect(SEED_EXERCISES).toMatch(/DemoAssetUploader/);
  });
});
