# CI — test og lint som PR-gate

**Date:** 2026-09-03 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/ci-github-actions-ab3c` against `main`
**Out of scope:** Coach Priority Inbox, dashboard Today prose, module billing,
cron alerting, middleware, privacy, live `db:push`, merge to `main`,
secret rotation, mass-fix of historical lint uden for `src/`

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `d686cfa` after `git fetch origin main`:

| Claim | Evidence |
|---|---|
| Ingen GitHub Actions | `.github/workflows/` findes ikke |
| PR-checks i dag er kun Vercel build | ingen workflow-filer; lint/test kører kun lokalt |
| `eslint.config.mjs` ignorerer kun build-artefakter | `.next/**`, `out/**`, `build/**`, `next-env.d.ts` |
| `.worktrees/` er gitignored men ikke eslint-ignored | `.gitignore` linje 54; mangler i `globalIgnores` |
| `.worktrees/` findes ikke på denne agent | `ls .worktrees` → no such file — de ~698 historiske fejl kan ikke tælles her |
| `npm run lint` scanner 554 filer; 13 errors / 4 warnings | `npx eslint .` JSON-summary |
| Heraf i `src/`: 9 errors + 2 warnings | se §2 |
| Uden for `src/`: science-prototype + ét script-warning | `docs/science/science-prototype/**`, `scripts/seed-adaptive-demo.mjs` |
| Ingen `engines` i `package.json`; Next kræver `>=20.9.0`; README siger 20+ | `node_modules/next/package.json`; `README.md` |
| `npm ci` fejler på stock lockfile | mangler optional peer `@swc/helpers@0.5.23` (next-intl → @swc/core) |

## 1. Problem

Tests og lint kører kun når et menneske husker det. En PR der knækker
hundredvis af tests kan merges med grønne Vercel-checks.

Lokalt er `npm run lint` ubrugelig som gate så snart `.worktrees/`
findes — eslint følger ikke `.gitignore`.

## 2. Decision

1. **Workflow** `.github/workflows/ci.yml` på `pull_request` + `push` til `main`:
   `npm ci` → `npm test` → `npm run lint`. Fejler jobbet ved test- eller
   lint-fejl. Node 22 (LTS; matcher agenten og Vercels nuværende default;
   Next kræver ≥20.9). `actions/setup-node` npm-cache. Ingen secrets.
2. **`eslint.config.mjs`** ignorerer `.worktrees/**` og andet gitignored
   junk, plus science-prototypen (ikke app-overfladen). Så er
   `npm run lint` selv en brugbar lokal/CI-gate.
3. **Ret de få rigtige `src/`-fejl** (≤11) i stedet for at allowliste
   hele `src/` eller slå regler fra globalt.
4. **Lockfile:** én linje-gruppe så `npm ci` virker — optional peer
   `@swc/helpers@0.5.23`. Ingen øvrig deps-bump.

CI fanger en knækket test fordi `npm test` (`vitest run`) er et
hard-fail step: non-zero exit stopper jobbet, og GitHub markerer
checket rødt på PR'en.
