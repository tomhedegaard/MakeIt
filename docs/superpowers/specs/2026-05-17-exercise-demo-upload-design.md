# Exercise demo-asset upload — design

**Date:** 2026-05-17
**Status:** Approved (design)
**Area:** Coach console — exercise library editor (`/coach/exercises/[slug]`)

## Problem

The exercise editor exposes `demo_asset_url` as a plain text input. A coach
who receives demo-loop deliverables from a motion designer has no way to get
those files into the app — they would need direct Storage access and would
have to hand-type the resulting URL. The brief (`docs/EXERCISE_VISUAL_BRIEF.md`)
defines three deliverables per exercise: `{slug}.webm`, `{slug}.mp4`, and
`{slug}-poster.jpg`.

## Goal

Let a coach upload the full set (WebM + MP4 + poster JPG) for an exercise
directly from the editor, and have the demo loop + loading poster render on
`/train/exercises/[slug]` with no SQL or manual URL entry.

## Non-goals

- No validation of resolution / duration / seamless-loop. The brief's
  720×1280 / 3–4 s spec stays a designer responsibility. The Storage bucket
  enforces MIME type and file size only.
- No in-app video editing, transcoding, or poster auto-extraction.
- No change to the figure/phase-animation fallbacks in `ExerciseDemo`.

## Approach

Convention-based, single DB field. The three files are stored in one public
Storage bucket under the brief's naming convention, so a single
`demo_asset_url` value resolves all three.

### Storage

New migration `0033_exercise_demo_storage.sql`:

- Public bucket `exercise-demos` (library content shown to every member;
  `<video src>` loads directly, CDN-cacheable, no signed-URL juggling).
- `file_size_limit`: 5 MB (brief targets <400 KB/loop; 5 MB is generous
  headroom).
- `allowed_mime_types`: `video/webm`, `video/mp4`, `image/jpeg`.
- RLS on `storage.objects` scoped to `bucket_id = 'exercise-demos'`:
  - `INSERT` / `UPDATE` / `DELETE` — `to authenticated` with
    `public.is_current_user_coach()`.
  - `SELECT` — public read (the bucket is public; objects are still listed
    via the public path).

### File naming

Files are stored at the bucket root keyed by exercise slug:

- `{slug}.webm`
- `{slug}.mp4`
- `{slug}-poster.jpg`

`demo_asset_url` stores the public base URL of the WebM, e.g.
`https://<project>.supabase.co/storage/v1/object/public/exercise-demos/back-squat.webm`.
`ExerciseDemo` already strips the `.(webm|mp4)` extension to a base; the
poster is derived as `${base}-poster.jpg`.

### Components

**`DemoAssetUploader`** (new, `src/components/coach/DemoAssetUploader.tsx`)

Replaces the "Demo-asset URL" text input in the editor's Metadata section.

- Three labelled file inputs: WebM, MP4, Poster (JPG).
- Each input uploads on selection via the Supabase browser client
  (`@/lib/supabase/client`) to `exercise-demos/{slug}.{ext}` with
  `upsert: true` (a re-upload overwrites the previous file).
- Per-file UI state: idle / uploading / done (shows resolved filename) /
  error.
- Once a WebM or MP4 is present, render a small looping `<video>` preview.
- Props: `slug`, `initialDemoAssetUrl`.
- Mirrors the existing `uploadVideoToStorage` helper pattern in
  `FormCheckSheet.tsx` (browser client, auth check, MIME + size guard).

**`uploadDemoAssetAction`** (new, in `src/app/coach/exercises/actions.ts`)

- Called by `DemoAssetUploader` after a successful WebM upload (the WebM
  defines the canonical base URL).
- Sets `exercises.demo_asset_url` to the public base URL **plus a
  cache-bust query** `?v={Date.now()}` — the bucket is CDN-cached, so a
  re-upload of the same path must change the stored URL to invalidate.
- `revalidatePath` for `/coach/exercises`, `/coach/exercises/{slug}`,
  `/train/exercises`, `/train/exercises/{slug}`.

> Cache-bust note: `ExerciseDemo` strips only the extension. The `?v=`
> query lives after the extension, so `${base}.webm?v=123` →
> `source src="${base}.webm?v=123"`. The regex
> `replace(/\.(webm|mp4)$/, "")` is anchored to end-of-string and will
> **not** match when a query follows. `ExerciseDemo` must strip the query
> before resolving siblings — see "Changes to ExerciseDemo".

### Changes to `ExerciseDemo`

- Accept the `demoAssetUrl` possibly carrying a `?v=` query. Split off the
  query, strip the extension from the path, re-resolve `${base}.webm`,
  `${base}.mp4`, `${base}-poster.jpg`, and re-attach the query to each so
  the cache-bust applies to all three.
- Use the derived poster as the `<video poster>`.

### Changes to `ExerciseHero`

- Currently `posterUrl` is never passed to `ExerciseDemo`. After this
  change `ExerciseDemo` derives the poster itself from `demoAssetUrl`, so
  `ExerciseHero` needs no new prop — the `posterUrl` prop on `ExerciseDemo`
  becomes redundant and is removed.

### Editor wiring

- `ExerciseEditor` drops the `demoAssetUrl` text input and local state for
  it; renders `<DemoAssetUploader slug={exercise.slug} initialDemoAssetUrl={exercise.demoAssetUrl} />`.
- `demo_asset_url` is no longer part of the `saveExerciseAction` payload —
  it is owned entirely by `uploadDemoAssetAction`. This decouples the
  3-file upload from the metadata "Gem øvelse" save.

## Data flow

1. Coach picks a WebM file → `DemoAssetUploader` uploads to
   `exercise-demos/{slug}.webm` (`upsert: true`).
2. On success → `uploadDemoAssetAction(slug)` writes
   `demo_asset_url = {publicBase}?v={ts}` and revalidates.
3. Coach picks MP4 / poster → uploaded to `{slug}.mp4` / `{slug}-poster.jpg`.
   These do not touch the DB (their paths are derived from the WebM base).
4. `/train/exercises/{slug}` reads `demo_asset_url`; `ExerciseDemo`
   resolves the webm/mp4/poster trio and renders the looping `<video>`.

## Error handling

- Browser client absent (demo mode, no Supabase) → uploader renders a
  disabled state with an explanatory line; no crash.
- Upload error (size, MIME, RLS denial) → per-file error message inline;
  other files unaffected.
- Coach uploads MP4 / poster but never a WebM → `demo_asset_url` stays
  unset, so `ExerciseDemo` falls back to phase animation / static figure.
  Acceptable: the WebM is the canonical primary asset per the brief.
- Re-upload after a slug rename: `demo_asset_url` is an absolute URL and
  keeps working; only the path/slug correspondence drifts. Out of scope —
  slugs are immutable in the current editor.

## Testing

- Migration applies cleanly on `supabase db reset`; bucket + 4 policies
  present.
- Manual: upload all three files for an exercise in the editor, confirm
  `demo_asset_url` is set with `?v=`, confirm the loop + poster render on
  `/train/exercises/{slug}`.
- Manual: re-upload a WebM, confirm the `?v=` timestamp changes and the
  new asset is served (not the CDN-cached old one).
- `tsc --noEmit` and `eslint` clean.

## Files

- `supabase/migrations/0033_exercise_demo_storage.sql` (new)
- `src/components/coach/DemoAssetUploader.tsx` (new)
- `src/app/coach/exercises/actions.ts` (add `uploadDemoAssetAction`, drop
  `demoAssetUrl` from `ExerciseSavePayload` + `saveExerciseAction`)
- `src/app/coach/exercises/[slug]/ExerciseEditor.tsx` (swap text input for
  uploader, drop `demoAssetUrl` state)
- `src/components/exercise/ExerciseDemo.tsx` (query-aware sibling
  resolution, derive poster, drop `posterUrl` prop)
- `src/app/(app)/train/exercises/[slug]/ExerciseHero.tsx` (no `posterUrl`
  passthrough needed — minor cleanup)
