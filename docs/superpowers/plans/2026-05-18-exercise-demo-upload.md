# Exercise Demo-Asset Upload Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach upload an exercise's demo-loop trio (WebM + MP4 + poster JPG) from the exercise-library editor, so the loop and loading poster render on `/train/exercises/[slug]` with no manual URL entry.

**Architecture:** A new public Supabase Storage bucket `exercise-demos` holds the three files per exercise, named by the brief's convention (`{slug}.webm` / `{slug}.mp4` / `{slug}-poster.jpg`). A single `demo_asset_url` value (the WebM public URL plus a `?v=` cache-bust) resolves all three via a shared `resolveDemoAssets` helper. Uploads happen immediately on file selection via the Supabase browser client and are persisted by a dedicated server action, decoupled from the metadata save.

**Tech Stack:** Next.js (App Router), Supabase (Postgres + Storage + RLS), TypeScript, React.

**Spec:** `docs/superpowers/specs/2026-05-17-exercise-demo-upload-design.md`

**Testing note:** This project has no unit-test framework. Verification per task is `npx tsc --noEmit`, `npx eslint <files>`, and — for the final task — applying the migration locally and a manual browser check. This matches how the exercise editor was verified.

---

## Chunk 1: Demo-asset upload

### Task 1: Storage bucket migration

**Files:**
- Create: `supabase/migrations/0033_exercise_demo_storage.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =================================================================
-- MakeIt // HQ — exercise demo-asset storage (Supabase Storage)
-- =================================================================
-- Public bucket for exercise demo loops. Each exercise has a trio:
--   {slug}.webm, {slug}.mp4, {slug}-poster.jpg
-- Library content shown to every member — public so <video src>
-- loads directly and the CDN can cache it. Only coaches can write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-demos',
  'exercise-demos',
  true,                 -- public read
  5242880,              -- 5 MB (brief targets <400 KB/loop)
  array['video/webm', 'video/mp4', 'image/jpeg']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read — bucket is public; this lists objects via public path.
drop policy if exists "exercise-demos public read" on storage.objects;
create policy "exercise-demos public read"
  on storage.objects for select
  to public
  using (bucket_id = 'exercise-demos');

-- Coaches insert. upsert:true on the client needs INSERT + UPDATE.
drop policy if exists "exercise-demos coach insert" on storage.objects;
create policy "exercise-demos coach insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'exercise-demos'
    and public.is_current_user_coach()
  );

drop policy if exists "exercise-demos coach update" on storage.objects;
create policy "exercise-demos coach update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'exercise-demos'
    and public.is_current_user_coach()
  )
  with check (
    bucket_id = 'exercise-demos'
    and public.is_current_user_coach()
  );

drop policy if exists "exercise-demos coach delete" on storage.objects;
create policy "exercise-demos coach delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'exercise-demos'
    and public.is_current_user_coach()
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0033_exercise_demo_storage.sql
git commit -m "feat(coach): storage bucket + RLS for exercise demo assets"
```

> Migration is applied + verified in Task 7 alongside the browser check.

---

### Task 2: `resolveDemoAssets` helper

**Files:**
- Modify: `src/lib/data/exercises.ts` (add an exported helper near `dominantView`, ~line 216)

- [ ] **Step 1: Add the helper**

Add to `src/lib/data/exercises.ts`:

```ts
export type DemoAssets = { webm: string; mp4: string; poster: string };

/**
 * Resolves a demo_asset_url into its webm / mp4 / poster siblings.
 * The stored URL points at one file and may carry a `?v=` cache-bust
 * query; the brief names the trio {slug}.webm / {slug}.mp4 /
 * {slug}-poster.jpg, so the other two are derived. The query is split
 * off before the extension is stripped (the strip regex is
 * end-anchored) and re-attached to all three so the cache-bust holds.
 */
export function resolveDemoAssets(demoAssetUrl: string): DemoAssets {
  const [path, query] = demoAssetUrl.split("?");
  const q = query ? `?${query}` : "";
  const base = path.replace(/\.(webm|mp4)$/, "");
  return {
    webm: `${base}.webm${q}`,
    mp4: `${base}.mp4${q}`,
    poster: `${base}-poster.jpg${q}`,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/exercises.ts
git commit -m "feat(exercise): resolveDemoAssets helper for demo-loop siblings"
```

---

### Task 3: Use the helper + poster in `ExerciseDemo`

**Files:**
- Modify: `src/components/exercise/ExerciseDemo.tsx`

- [ ] **Step 1: Replace the video branch and drop the `posterUrl` prop**

In `ExerciseDemo.tsx`:

1. Add the import:

```ts
import { resolveDemoAssets } from "@/lib/data/exercises";
```

2. Remove `posterUrl` from the props type and the destructured params (it is currently never passed by `ExerciseHero`, so this is dead).

3. Replace the `if (demoAssetUrl) { ... }` block (lines ~41-58) with:

```tsx
  if (demoAssetUrl) {
    const { webm, mp4, poster } = resolveDemoAssets(demoAssetUrl);
    return (
      <video
        autoPlay
        loop
        muted
        playsInline
        poster={poster}
        className="rounded-lg w-full max-w-[240px]"
      >
        <source src={webm} type="video/webm" />
        <source src={mp4} type="video/mp4" />
      </video>
    );
  }
```

Update the component's doc comment: the demo asset is now resolved via
`resolveDemoAssets`, and the poster still-frame is always derived.

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/components/exercise/ExerciseDemo.tsx`
Expected: no errors. `tsc` confirms no remaining caller passes `posterUrl`
(`ExerciseHero` is the only consumer and never did).

- [ ] **Step 3: Commit**

```bash
git add src/components/exercise/ExerciseDemo.tsx
git commit -m "feat(exercise): resolve demo trio + poster from demo_asset_url"
```

---

### Task 4: `uploadDemoAssetAction` + remove `demo_asset_url` from the save action

**Files:**
- Modify: `src/app/coach/exercises/actions.ts`

- [ ] **Step 1: Drop `demo_asset_url` from the metadata save**

In `actions.ts`:
- Remove the `demoAssetUrl: string | null;` field from `ExerciseSavePayload`.
- Remove the `demo_asset_url: payload.demoAssetUrl,` line from the
  `update({...})` object in `saveExerciseAction`.

`demo_asset_url` is now owned solely by `uploadDemoAssetAction`. Leaving
the key would write `undefined` and null out a freshly-uploaded URL on a
metadata save.

- [ ] **Step 2: Add `uploadDemoAssetAction`**

Append to `actions.ts`:

```ts
/* ---------------------------------------------------------------- *
 * Demo asset — persist demo_asset_url after a coach uploads the WebM
 * ---------------------------------------------------------------- */

/**
 * Called by DemoAssetUploader after the WebM lands in the
 * `exercise-demos` bucket. The WebM is the canonical primary asset;
 * its public URL (plus a `?v=` cache-bust — the bucket is CDN-cached
 * so a re-upload of the same path needs a changed URL) becomes
 * demo_asset_url. The mp4/poster siblings are derived, never stored.
 */
export async function uploadDemoAssetAction(input: {
  exerciseId: string;
  slug: string;
}): Promise<{ ok: boolean; demoAssetUrl?: string; error?: string }> {
  if (!SUPABASE_ENABLED) return { ok: false, error: "Supabase ikke konfigureret" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Ingen forbindelse" };

  const { data } = supabase.storage
    .from("exercise-demos")
    .getPublicUrl(`${input.slug}.webm`);
  const demoAssetUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error } = await supabase
    .from("exercises")
    .update({ demo_asset_url: demoAssetUrl })
    .eq("id", input.exerciseId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/exercises");
  revalidatePath(`/coach/exercises/${input.slug}`);
  revalidatePath("/train/exercises");
  revalidatePath(`/train/exercises/${input.slug}`);
  return { ok: true, demoAssetUrl };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors in `ExerciseEditor.tsx` (it still passes `demoAssetUrl`
in the save payload and reads the dropped field). Those are fixed in
Task 6 — that is expected at this step.

- [ ] **Step 4: Commit**

```bash
git add src/app/coach/exercises/actions.ts
git commit -m "feat(coach): uploadDemoAssetAction, decouple demo_asset_url from save"
```

---

### Task 5: `DemoAssetUploader` component

**Files:**
- Create: `src/components/coach/DemoAssetUploader.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveDemoAssets } from "@/lib/data/exercises";
import { uploadDemoAssetAction } from "@/app/coach/exercises/actions";

const BUCKET = "exercise-demos";

type SlotKey = "webm" | "mp4" | "poster";
type SlotState = "idle" | "uploading" | "done" | "error";

const SLOTS: { key: SlotKey; label: string; ext: string; accept: string; mime: string }[] = [
  { key: "webm",   label: "Demo-loop (WebM)", ext: "webm", accept: "video/webm", mime: "video/webm" },
  { key: "mp4",    label: "Demo-loop (MP4)",  ext: "mp4",  accept: "video/mp4",  mime: "video/mp4" },
  { key: "poster", label: "Poster (JPG)",     ext: "jpg",  accept: "image/jpeg", mime: "image/jpeg" },
];

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Three-slot uploader for an exercise's demo trio. Each file uploads on
 * selection to `exercise-demos/{slug}.{ext}` (upsert). A successful WebM
 * upload triggers uploadDemoAssetAction, which persists demo_asset_url.
 * The mp4/poster slots only place files at their derived paths.
 */
export default function DemoAssetUploader({
  exerciseId,
  slug,
  initialDemoAssetUrl,
}: {
  exerciseId: string;
  slug: string;
  initialDemoAssetUrl: string | null;
}) {
  const [demoAssetUrl, setDemoAssetUrl] = useState(initialDemoAssetUrl);
  const [state, setState] = useState<Record<SlotKey, SlotState>>({
    webm: "idle",
    mp4: "idle",
    poster: "idle",
  });
  const [errors, setErrors] = useState<Partial<Record<SlotKey, string>>>({});
  const [, startPersist] = useTransition();

  const supabase = createClient();

  async function handleFile(slotKey: SlotKey, ext: string, mime: string, file: File) {
    setErrors((e) => ({ ...e, [slotKey]: undefined }));

    if (file.size > MAX_BYTES) {
      setState((s) => ({ ...s, [slotKey]: "error" }));
      setErrors((e) => ({ ...e, [slotKey]: "Filen er over 5 MB" }));
      return;
    }
    if (!supabase) {
      setState((s) => ({ ...s, [slotKey]: "error" }));
      setErrors((e) => ({ ...e, [slotKey]: "Supabase ikke konfigureret" }));
      return;
    }

    setState((s) => ({ ...s, [slotKey]: "uploading" }));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${slug}.${ext}`, file, {
        cacheControl: "3600",
        contentType: mime,
        upsert: true,
      });

    if (error) {
      setState((s) => ({ ...s, [slotKey]: "error" }));
      setErrors((e) => ({ ...e, [slotKey]: error.message }));
      return;
    }

    setState((s) => ({ ...s, [slotKey]: "done" }));

    // WebM is canonical — persist demo_asset_url once it lands.
    if (slotKey === "webm") {
      startPersist(async () => {
        const res = await uploadDemoAssetAction({ exerciseId, slug });
        if (res.ok && res.demoAssetUrl) {
          setDemoAssetUrl(res.demoAssetUrl);
        } else {
          setErrors((e) => ({ ...e, webm: res.error ?? "Kunne ikke gemme" }));
        }
      });
    }
  }

  const preview = demoAssetUrl ? resolveDemoAssets(demoAssetUrl) : null;

  return (
    <section className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
      <div className="eyebrow">Demo-asset</div>
      <p className="text-xs text-fg-dim">
        Upload de tre filer fra motion-designeren. WebM aktiverer demo-loopet
        på /train/exercises — MP4 er fallback, JPG er poster mens loopet
        loader.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {SLOTS.map((slot) => (
          <label key={slot.key} className="space-y-1.5 block">
            <span className="text-xs text-fg-dim">{slot.label}</span>
            <input
              type="file"
              accept={slot.accept}
              disabled={state[slot.key] === "uploading"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(slot.key, slot.ext, slot.mime, file);
              }}
              className="block w-full text-xs text-fg-dim file:mr-3 file:rounded-md file:border-0 file:bg-bg-3 file:px-3 file:py-1.5 file:text-fg"
            />
            <span className="text-[11px] font-mono text-fg-faint">
              {state[slot.key] === "uploading" && "Uploader…"}
              {state[slot.key] === "done" && `Uploadet — ${slug}.${slot.ext}`}
              {state[slot.key] === "error" && (errors[slot.key] ?? "Fejl")}
            </span>
          </label>
        ))}
      </div>

      {preview ? (
        <div className="surface rounded-lg p-4">
          <div className="eyebrow mb-2">Forhåndsvisning</div>
          <video
            key={preview.webm}
            autoPlay
            loop
            muted
            playsInline
            poster={preview.poster}
            className="rounded-lg w-full max-w-[200px]"
          >
            <source src={preview.webm} type="video/webm" />
            <source src={preview.mp4} type="video/mp4" />
          </video>
        </div>
      ) : (
        <p className="text-[11px] font-mono text-fg-faint">
          Intet demo-loop endnu — upload en WebM for at aktivere det.
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/components/coach/DemoAssetUploader.tsx`
Expected: no errors (the `ExerciseEditor` errors from Task 4 still
remain — fixed in Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/components/coach/DemoAssetUploader.tsx
git commit -m "feat(coach): DemoAssetUploader — three-slot demo upload widget"
```

---

### Task 6: Wire the uploader into `ExerciseEditor`

**Files:**
- Modify: `src/app/coach/exercises/[slug]/ExerciseEditor.tsx`

- [ ] **Step 1: Swap the text field for the uploader**

In `ExerciseEditor.tsx`:

1. Add the import:

```ts
import DemoAssetUploader from "@/components/coach/DemoAssetUploader";
```

2. Remove the `demoAssetUrl` state line:

```ts
const [demoAssetUrl, setDemoAssetUrl] = useState(exercise.demoAssetUrl ?? "");
```

3. Remove the `demoAssetUrl: demoAssetUrl.trim() || null,` line from the
   `saveExerciseAction({...})` payload in `save()`.

4. Remove the "Demo-asset URL (valgfri)" `<Field>` block (the `<input>`
   bound to `demoAssetUrl`) from the Metadata `<section>`.

5. Immediately after the Metadata `</section>`, render the uploader:

```tsx
      <DemoAssetUploader
        exerciseId={exercise.id}
        slug={exercise.slug}
        initialDemoAssetUrl={exercise.demoAssetUrl}
      />
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/coach/exercises src/components/exercise/ExerciseDemo.tsx`
Expected: no errors — all `demoAssetUrl` references in `ExerciseEditor`
are gone and the save payload matches the trimmed `ExerciseSavePayload`.

- [ ] **Step 3: Commit**

```bash
git add src/app/coach/exercises/[slug]/ExerciseEditor.tsx
git commit -m "feat(coach): exercise editor uses DemoAssetUploader"
```

---

### Task 7: Apply migration + full verification

**Files:** none (verification only)

- [ ] **Step 1: Apply the migration locally**

Run: `npm run db:reset`
Expected: all migrations replay cleanly through `0033`, local DB reseeded.
(`db:reset` rebuilds the local Supabase DB — dev data only.)

- [ ] **Step 2: Confirm the bucket + policies**

Run:
```bash
npx supabase db lint 2>&1 | tail -5
```
Expected: no errors. Optionally confirm via Studio that the
`exercise-demos` bucket exists and is public with 4 policies on
`storage.objects`.

- [ ] **Step 3: Type-check + lint the whole change**

Run: `npx tsc --noEmit && npx eslint src/app/coach/exercises src/components/coach/DemoAssetUploader.tsx src/components/exercise/ExerciseDemo.tsx src/lib/data/exercises.ts`
Expected: no errors.

- [ ] **Step 4: Manual browser check**

With the dev server running (`npm run dev`, port 3002):
1. Open `http://localhost:3002/coach/exercises/back-squat`.
2. In the new "Demo-asset" section, upload a `.webm`, `.mp4`, and `.jpg`
   (any small valid files). Each slot shows "Uploadet — …".
3. Confirm the "Forhåndsvisning" video appears after the WebM upload.
4. Open `http://localhost:3002/train/exercises/back-squat` — confirm the
   demo loop renders as a `<video>` (not the anatomy figure).
5. Re-upload a different WebM; confirm the `demo_asset_url`'s `?v=`
   timestamp changes (DevTools → the `<video>` `src`) and the new asset
   is served, not the CDN-cached old one.
6. Check the browser console for errors — expect none.

- [ ] **Step 5: Final commit (if any verification-driven fixes were made)**

```bash
git add -A
git commit -m "fix(coach): demo-asset upload verification fixes"
```

(Skip if Step 4 surfaced no issues.)

---

## Done when

- Migration `0033` applies cleanly; `exercise-demos` bucket is public with coach-only write RLS.
- A coach can upload the WebM/MP4/poster trio from the editor; `demo_asset_url` is set with a `?v=` cache-bust.
- `/train/exercises/[slug]` renders the demo loop with the poster still-frame.
- `tsc --noEmit` and `eslint` are clean across all touched files.
