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
    .filter((f) => f.endsWith(".webm") && !f.endsWith("-portrait.webm"))
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

  it("derives the 9:16 portrait trio next to the landscape one", () => {
    expect(resolveDemoAssets("/exercise-demos/back-squat.webm?v=2", "portrait")).toEqual({
      webm: "/exercise-demos/back-squat-portrait.webm?v=2",
      mp4: "/exercise-demos/back-squat-portrait.mp4?v=2",
      poster: "/exercise-demos/back-squat-portrait-poster.jpg?v=2",
    });
    expect(resolveDemoAssets("https://x.test/exercise-demos/band-row.webm", "landscape").webm).toBe(
      "https://x.test/exercise-demos/band-row.webm",
    );
  });
});

describe("bundled v1 demo loops", () => {
  const disk = slugsOnDisk();

  it("manifest matches every trio on disk (and nothing extra)", () => {
    expect([...BUNDLED_DEMO_SLUGS].sort()).toEqual(disk);
    for (const slug of disk) {
      expect(existsSync(join(DEMO_DIR, `${slug}.mp4`))).toBe(true);
      expect(existsSync(join(DEMO_DIR, `${slug}-poster.jpg`))).toBe(true);
      // Every loop also ships in 9:16 for vertical surfaces.
      for (const f of [`${slug}-portrait.webm`, `${slug}-portrait.mp4`, `${slug}-portrait-poster.jpg`]) {
        expect(existsSync(join(DEMO_DIR, f)), f).toBe(true);
      }
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

  it("covers all 20 core exercises, front-squat included", () => {
    expect(disk).toHaveLength(20);
    expect(disk).toEqual(MOCK_EXERCISES.map((e) => e.slug).sort());
    expect(bundledDemoAssetUrl("front-squat")).toBe("/exercise-demos/front-squat.webm");
    expect(bundledDemoAssetUrl("no-such-lift")).toBeNull();
  });

  it("does not overwrite Storage URLs on seed (coach upload contract)", () => {
    expect(SEED_EXERCISES).toMatch(/demo_asset_url like '\/exercise-demos\/%'/);
    expect(SEED_EXERCISES).toMatch(/DemoAssetUploader/);
  });
});
