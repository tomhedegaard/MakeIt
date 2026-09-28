# MakeIt Member App — Retroactive 6-Pillar UI Audit

**Scope:** Whole-app static code audit (not phase-scope). Subject: `src/app/(app)/*` member surfaces, `src/components/ui/*` primitives, `src/components/marketing/kalk/*` landing, `messages/da/*` copy catalog, `src/app/globals.css` tokens.
**Method:** Adversarial code-only review per gsd-ui-auditor rubric (1–4 per pillar). **No Playwright, no dev server, no screenshots were used** — a second agent was concurrently driving a real browser against this app and this audit intentionally stayed off that surface. All findings are grep/read evidence, `file:line` cited.
**Branch/commit:** `review/ux-2026-09-19` @ main=62290ce, worktree `/Users/tomhedegaard/MakeIt/.worktrees/ux-review`.

## Score Table

| Pillar | Score /4 | Key Finding |
|---|---|---|
| 1. Copywriting | 3 | Copy is well-migrated to `next-intl` (50/65 app `.tsx` files use `useTranslations`); no raw hardcoded UI text found in app JSX, but a handful of raw Danish placeholders bypass the catalog. |
| 2. Visuals | 2 | `Card` primitive exists but is imported in only 1 of ~65 app route files; at least 6 hand-rolled bordered/rounded "card" divs duplicate it, and 20 pages hand-build `<h1>/<h2>` with ad-hoc font-display classes instead of `PageTitle`/`SectionHeader`. |
| 3. Color | 2 | Domain-color dosing is broadly respected (no domain hue in buttons/alerts found), but token discipline leaks: coach-admin surfaces (`MuscleTierPicker.tsx`, `NewExerciseForm.tsx`, `NewProgramForm.tsx`) hardcode hex instead of `var(--domain)`/`text-danger`. |
| 4. Typography | 2 | Font-size usage sprawls across 39 distinct size classes including 25+ arbitrary `text-[Npx]` values, far beyond the spec's documented 6-step scale (Display/Title/Heading/Body/Data/Label). |
| 5. Spacing | 2 | 108 arbitrary bracket spacing values found; concentrated in `src/components/marketing/phone/screens/*` (mock phone UI) using odd values like `py-[5px]`, `gap-[9px]`, `mt-[7px]` instead of the 4/8px Tailwind scale. |
| 6. Experience Design | 2 | `EmptyState` primitive is imported in only 1 file app-wide; only 3 of 19 route segments (`mind`, `nutrition`, `session`) ship a route-level `loading.tsx`, and only `coaching` has both a `loading.tsx` and explicit error/catch handling — most screens have no visible loading/error/empty coverage beyond the single root-level `(app)/loading.tsx` and `(app)/error.tsx`. |

**Overall: 13/24**

Scores are not averaged upward: Visuals, Color, Typography, Spacing, and Experience Design all land at 2/4 because each has concrete, repeated violations found by evidence, not just isolated one-offs.

## Top Priority Fixes

1. **Experience Design — route-level loading/error/empty coverage is nearly absent.** Only `mind/loading.tsx`, `nutrition/loading.tsx`, `session/loading.tsx` exist; 16 of 19 route segments (dashboard, hrv, train, program, coaching-detail, community, billing, profile, messages, buddy, form-check, push, science, reps, settings, coach-school) rely solely on the root `(app)/loading.tsx` + `(app)/error.tsx` fallback, and only 5 files app-wide reference `isLoading`/`isPending` at all. Users on slow data screens (HRV trends, nutrition shopping, coach-school) get no per-screen loading affordance.
2. **Visuals — `Card` primitive is essentially unused; hand-rolled cards duplicate it.** `src/components/ui/Card.tsx` is imported in only 1 app file. Ad-hoc equivalents: `src/app/(app)/nutrition/page.tsx:205,223,242`, `src/app/(app)/session/[id]/SessionClient.tsx:252`, `src/app/(app)/train/exercises/[slug]/page.tsx:160`, `src/app/(app)/settings/SettingsClient.tsx:162` — all hand-build `surface-2 rounded-xl border` instead of `<Card>`.
3. **Visuals — 20 hand-built `<h1>/<h2>` headers bypass `PageTitle`/`SectionHeader`.** Examples: `src/app/(app)/dashboard/page.tsx:284`, `src/app/(app)/community/page.tsx:147`, `src/app/(app)/coaching/page.tsx:189`, `src/app/(app)/mind/sessions/page.tsx:64`, `src/app/(app)/session/[id]/SessionPreview.tsx:66,155`. Each reimplements `font-display text-3xl md:text-4xl leading-[1]` by hand rather than using the primitive that exists for exactly this.
4. **Color — coach/admin surfaces hardcode hex instead of tokens.** `src/components/coach/MuscleTierPicker.tsx:27-28,72,90` and `src/components/coach/NewExerciseForm.tsx:74` and `src/components/coach/NewProgramForm.tsx:119` use literal `#F5F2EC`, `#C97B3E`, `#0A0A0B`, `#2a2a2e` and a `style={{ color: "var(--danger, #C97B3E)" }}` fallback that silently reintroduces a non-danger hardcoded orange if the token resolution ever fails.
5. **Typography — scale drift.** 39 distinct `text-*` size classes in play (`text-[7.5px]` through `text-[200px]`), including 10+ singleton arbitrary pixel sizes (`text-[19px]`, `text-[17px]`, `text-[16px]`, `text-[14px]`, `text-[0.95rem]`, etc.) that don't map to the spec's 6-step Display/Title/Heading/Body/Data/Label scale — mostly concentrated in one-off marketing/phone-mock components but bleeding into app surfaces too.
6. **Copywriting — a few raw Danish literals bypass the message catalog.** `src/app/(app)/settings/SettingsClient.tsx:121` (`placeholder="munk"`) and `src/app/(app)/nutrition/OffPlanLogButton.tsx:105,119,132` (`placeholder="fx 650"`, `placeholder="fx 35"`, `placeholder="fx burger og pomfritter ude i byen"`) are hardcoded example strings, not pulled from `messages/da/*`.

## Detailed Findings by Pillar

### 1. Copywriting — 3/4
- **Positive:** 50 of 65 `.tsx` files under `src/app/(app)/` call `useTranslations`/`getTranslations`; a full grep for literal Danish/English text between JSX tags (`>Word<`) across the app surface returned **zero** matches outside of legitimate `t()`-driven content — copy discipline is strong at the component-text level.
- **Gap:** `placeholder` attributes are exempt from that pattern and leak raw strings: `src/app/(app)/settings/SettingsClient.tsx:121` (`placeholder="munk"`), `src/app/(app)/nutrition/OffPlanLogButton.tsx:105,119,132` (example placeholders for calories/protein/description). These should be `t("...")` calls like the rest of the form.
- No generic `Submit`/`OK`/`Cancel` labels were found (`grep` for `>Gem<`, `>Annuller<`, `>Slet<`, `>Submit<`, `>OK<` returned 0 hits in app+components) — buttons appear to use specific, translated verbs.
- Not independently verified: whether every `t()` key actually resolves to specific (non-generic) empty/error copy inside `messages/da/*.json` — only that the calls exist, not the string quality behind each key.

### 2. Visuals — 2/4
- `PageTitle`/`SectionHeader`/`Card`/`EmptyState` are well-designed, single-purpose primitives (read in full) but adoption is low:
  - `Card` imported in **1** app file only (`grep -rl "@/components/ui/Card" src/app/(app)`).
  - `EmptyState` imported in **1** app file only.
  - 20 files hand-build `<h1>`/`<h2>` with manual `font-display text-*` classes instead of `PageTitle`/`SectionHeader` — see list in Top Priority Fixes #3, plus `src/app/(app)/hrv/learn/page.tsx:34`, `src/app/(app)/nutrition/setup/SetupWizardClient.tsx:201`, `src/app/(app)/mind/settings/page.tsx:50,91,103` (three near-identical hand-built `<h2 className="font-display text-xl mb-2">` in one file).
  - 6 hand-rolled bordered/rounded "card" divs duplicate `Card`'s `bg-bg-2 rounded-[14px] border` recipe with slightly different values (`surface-2 rounded-xl border hairline-strong`, `rounded-2xl p-6 lg:p-8`), meaning the app now has at least two competing card treatments.
- Icon-only `<button>` accessibility check (button containing an `<svg>` with no `aria-label`) returned **0** matches — this is a genuine pass, not just component-existence; icon buttons across app+components do carry `aria-label`.

### 3. Color — 2/4
- Domain-color dosing rule (§ DOMAIN_COLOR_SYSTEM.md: color only in kickers/accent-stroke/chart-ink/nav/dots/badge-tint, never buttons/alerts/body) appears respected in `src/app/globals.css` and primitive-level CSS — `.btn`/`.btn-primary` are monochrome (`globals.css:370-393`), and the `[data-domain]` pattern (`globals.css:189-192`) is the sanctioned mechanism.
- Domain usage spread is uneven but not obviously abusive: heart 7 files, food 7 files, body 13 files, mind 11 files referencing domain tokens/classes — body and mind are used roughly 1.7x more than heart/food, plausible given body covers `/train`+`/program`+`/session`+`/coaching` (4 route trees) vs. heart covering only `/hrv`.
- **Token discipline violation:** coach-facing admin components hardcode hex values that duplicate existing tokens rather than referencing them: `src/components/coach/MuscleTierPicker.tsx:27-28` (`primary: "#F5F2EC"`, `secondary: "#C97B3E"`), `:72` (`background: t ? TIER_DOT[t] : "#2a2a2e"`), `:90` (`color: "#0A0A0B"`); `src/components/coach/NewExerciseForm.tsx:74` (`style={{ color: "#C97B3E" }}`); `src/components/coach/NewProgramForm.tsx:119` (`style={{ color: "var(--danger, #C97B3E)" }}` — a fallback that reintroduces a hardcoded non-danger color if the CSS var fails to resolve).
- `src/components/anatomy/AnatomyFigure3D.tsx:37-42` also hardcodes the `--anatomy-*` token values as a JS object rather than reading the CSS custom properties, meaning this file will silently drift from `globals.css` if the anatomy tokens are ever retuned (they already were, once, per the Kalk spec §3 anatomy row).
- `viewport.themeColor` hardcodes hex in `src/app/(app)/layout.tsx:12` and `src/app/(app)/session/[id]/page.tsx:22` — acceptable/expected since `<meta name="theme-color">` cannot consume CSS custom properties, not counted against the score.

### 4. Typography — 2/4
- Font-size class census across `src/app/(app)/` + `src/components/`: **39 distinct `text-*` values**, including standard scale steps (`text-xs` 182×, `text-sm` 293×, `text-base` 79×, `text-lg` 34×, `text-xl` 33×, `text-2xl` 73×, `text-3xl` 53×, `text-4xl` 13×) *and* a long tail of arbitrary pixel/rem sizes: `text-[10px]` (171×), `text-[11px]` (97×), `text-[12px]`, `text-[9px]`, `text-[13px]`, `text-[10.5px]`, `text-[9.5px]`, `text-[8.5px]`, `text-[7.5px]`, `text-[8px]`, plus singleton one-offs `text-[36px]`, `text-[34px]`, `text-[30px]`, `text-[26px]`, `text-[24px]`, `text-[22px]`, `text-[20px]`, `text-[19px]`, `text-[17px]`, `text-[16px]`, `text-[15px]`, `text-[14px]`, `text-[0.95rem]`, `text-[200px]`, `text-[160px]`, `text-[52px]`, `text-[44px]`, `text-[40px]`, `text-[28px]`, `text-[11.5px]`.
- The design spec documents a 6-step scale (Display/Title/Heading/Body/Data/Label); the actual usage is closer to 15-20 effectively distinct sizes once the `text-[10px]`/`text-[11px]` mono-label variants are folded in. `text-[10px]`/`text-[11px]` at 171 and 97 occurrences respectively are clearly intentional (mono-label/eyebrow scale, close to the documented 11px kicker size), but the ~25 singleton arbitrary sizes above are drift, not system.
- Font-weight usage is comparatively disciplined: only `font-medium` (37×), `font-semibold` (6×), `font-bold` (1×) found — no arbitrary `font-[weight]` values, consistent with the token system relying on `.font-display`'s fixed `--display-weight: 800` for emphasis rather than weight utility classes.

### 5. Spacing — 2/4
- 108 arbitrary bracket spacing values (`p-/m-/gap-/space-[...]`) found across app+components. The worst offenders are concentrated in `src/components/marketing/phone/screens/*` (the landing page's mock phone UI, e.g. `SessionScreen.tsx:33,37,44,45`, `parts.tsx:70,89,110,198`, `MindScreen.tsx:34,60`, `MindCheckedScreen.tsx:34,39`, `HrvScreen.tsx:69`, `FormCheckScreen.tsx:37,50`, `FoodScreen.tsx:37,61`, `DashboardScreen.tsx:62,76`) using odd values like `py-[5px]`, `gap-[9px]`, `mt-[7px]`, `px-[11px]` instead of the standard Tailwind 4px-increment scale (`py-1`, `gap-2`, etc.) — these render at phone-mockup scale so the sub-pixel tuning is plausibly deliberate, but it's undocumented drift from the spacing scale nonetheless.
- `src/components/marketing/kalk/ScreenRack.tsx:20` uses a legitimate responsive-gutter `calc()` expression (`px-[max(2rem,calc((100%_-_1360px)/2_+_2rem))]`) — this is a justified arbitrary value, not sloppiness.
- Member-app surfaces (`src/app/(app)/*`) were not the dominant source of arbitrary spacing in this grep — most hits are in marketing/phone-mock components, which somewhat limits real-world impact but the count is still high enough to flag systemic looseness.

### 6. Experience Design — 2/4
- Route-level coverage census (19 top-level route segments under `src/app/(app)/`):
  - `loading.tsx`: only `mind`, `nutrition`, `session` (3/19).
  - `error.tsx`: **0/19** at the route-segment level — only the root `(app)/error.tsx` exists as a catch-all.
  - Explicit `isLoading`/`loading`/`isPending` state: only 5 files app-wide.
  - `EmptyState` primitive usage: 1 file app-wide (despite many list-type screens: messages, community, buddy, coach-school lessons, reps, nutrition shopping list, mind journal history).
  - `coaching` is the only route with both a loading-adjacent skeleton file and explicit `catch (`/`isError` handling.
- A targeted grep for ad-hoc "no data" copy patterns (`>Ingen<`, `>Ikke fundet<`, `>Tomt<`) returned 0 hits, suggesting screens without `EmptyState` may simply render nothing/blank rather than an ad-hoc replacement — worse than an ad-hoc div, since it gives no adversarial signal to the user at all. This could not be fully confirmed without running the app (out of scope per constraints), but the absence of both the primitive and any ad-hoc alternative text is itself the finding.
- Root-level `(app)/loading.tsx` and `(app)/error.tsx` exist and presumably catch the Suspense/error boundary for all nested routes per Next.js App Router semantics, which mitigates but does not eliminate the gap — a full-page loading fallback on every navigation is a materially worse UX than per-screen skeletons, especially for data-heavy screens like `hrv/trends`, `train/exercises`, `program/[code]`.

## Files Audited

**Docs/spec:**
- `docs/superpowers/specs/2026-09-17-kalk-redesign-design.md`
- `docs/DOMAIN_COLOR_SYSTEM.md`
- `src/app/globals.css`

**Primitives (`src/components/ui/`):**
- `PageTitle.tsx`, `SectionHeader.tsx`, `Card.tsx`, `EmptyState.tsx`, `Stat.tsx`, `Field.tsx`

**Member app surfaces (`src/app/(app)/`), sampled/grepped across all 19 route segments:** `settings/`, `form-check/`, `messages/`, `science/`, `buddy/`, `dashboard/`, `push/`, `hrv/` (+`insights`,`learn`,`trends`), `profile/`, `coach-school/` (+`sandbox`,`live`,`lessons`), `train/` (+`exercises`), `program/[code]`, `mind/` (+`journal`,`settings`,`today`,`sessions`,`cirkler`,`check`,`weekly`,`onboarding`), `community/`, `nutrition/` (+`preferences`,`shopping`,`setup`), `coaching/`, `reps/`, `billing/`, `session/[id]`. Files read in full: `nutrition/OffPlanLogButton.tsx`, `settings/SettingsClient.tsx`, `dashboard/page.tsx`, `community/page.tsx`, `coaching/page.tsx`, `session/[id]/SessionPreview.tsx`, `session/[id]/SessionClient.tsx`, `mind/settings/page.tsx`, `nutrition/page.tsx`, `train/exercises/[slug]/page.tsx`.

**Components grepped:** `src/components/coach/MuscleTierPicker.tsx`, `NewExerciseForm.tsx`, `NewProgramForm.tsx`; `src/components/anatomy/AnatomyFigure3D.tsx`, `anatomy3d-shapes.ts`; `src/components/marketing/kalk/*` (SystemsBento, MotorStory, CrewPlates, ScreenRack); `src/components/marketing/phone/screens/*`.

**Message catalog:** `messages/da/*.json` (index only — 32 domain files enumerated: Adaptive, FormCheck, Mind, Onboarding, Nav, Session, Buddy, Settings, Language, Misc, CoachSchool, Common, Nutrition, Marketing, Messages, ProgramDetail, Push, Coach, Hrv, Dashboard, Login, Train, Billing, Email, Coaching, Legal, Reps, Community, CoachStudio, Profile, Science). Per-key copy-quality review of every catalog string was not performed given the whole-app scope — this audit verified `useTranslations` call-site adoption, not the specificity of every translated string's content.
