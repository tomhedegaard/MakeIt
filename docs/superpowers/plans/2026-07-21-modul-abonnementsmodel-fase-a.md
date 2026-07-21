# Modul-abonnementsmodel — Fase A (entitlement-fundament) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Byg det entitlement-fundament som resten af modul-abonnementsmodellen hviler på — modul-katalog, udvidet `ProductKind`, en ren+testet entitlement-resolver og migration `0055` — uden nogen synlig UI-ændring og med grøn `npm run build` hele vejen.

**Architecture:** Et tyndt lag oven på den eksisterende Stripe-`subscriptions`-spine. Al logik lever i ren, unit-testet kode (`deriveEntitlements`); side-effektfulde wrappere (`getEntitlements` via React `cache()`, `requireModuleOrRedirect`) er tynd glue. Sandhedspunktet forbliver `subscriptions`-tabellen; intet materialiseres. Demo-mode (ingen Supabase) → alt-true, så lokal udvikling ser fuldt indhold.

**Tech Stack:** Next.js (App Router, RSC), TypeScript, Supabase (Postgres + RLS), Stripe, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-21-modul-abonnementsmodel-design.md` (rev. 2, godkendt). Denne plan dækker **kun Fase A** fra spec §10. Fase B–D får egne planer.

---

## Chunk 1: Entitlement-fundament

### File Structure

| Fil | Ansvar | Handling |
|---|---|---|
| `src/lib/modules.ts` | Statisk modul-katalog: `ModuleKey`, `MODULE_KEYS`, `MODULES` (domæne/rute/label/pris-env/trial), `BUNDLE_GRANTS` | Create |
| `src/lib/modules.test.ts` | Invariant-tests: katalog dækker alle keys; bundle ekspanderer til alle | Create |
| `src/lib/stripe.ts` | Udvid `ProductKind` med de fire moduler; `priceIdFor()` slår modul-priser op via env | Modify |
| `src/lib/stripe.test.ts` | `priceIdFor()` for modul-keys (env-baseret) | Create |
| `src/lib/data/billing.ts` | Compile-sikker touch: `getActiveSubscriptions` returnerer `Partial<Record<…>>` så den udvidede union kompilerer | Modify |
| `src/lib/data/entitlements.ts` | `deriveEntitlements` (ren), `getEntitlements` (cache-wrapped), `requireModuleOrRedirect` | Create |
| `src/lib/data/entitlements.test.ts` | Udtømmende tests af `deriveEntitlements` | Create |
| `supabase/migrations/0055_module_entitlements.sql` | Udvid `product_kind`-CHECK; ny `member_module_trials`-tabel + RLS | Create |
| `.env.example` | Dokumentér `STRIPE_PRICE_TRAIN/_NUTRITION/_HRV/_MIND` | Modify |

**Decomposition-noter:**
- Al ægte logik ligger i `deriveEntitlements` (ren funktion) — det er dér TDD-fokus er. `getEntitlements`/`requireModuleOrRedirect` er triviel glue (Supabase-fetch, `cache()`, `redirect()`), som huset ikke unit-tester (jf. side-effektfulde wrappere i `lib/data/*`).
- `ProductKind`-udvidelsen (Task 2) brækker `billing.ts:37` hvis den står alene → derfor er stripe-udvidelse + billing-fix **samme task/commit**, så intet commit har rødt build.
- Fase A refererer ikke `member_module_trials` i kode (kun webhooken i Fase C gør), så `npm run db:types`-regenerering er **ikke** nødvendig her.

---

### Task 1: Modul-katalog (`src/lib/modules.ts`)

**Files:**
- Create: `src/lib/modules.ts`
- Test: `src/lib/modules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/modules.test.ts
import { describe, expect, it } from "vitest";
import { MODULES, MODULE_KEYS, BUNDLE_GRANTS } from "./modules";

describe("modules catalog", () => {
  it("has one entry per module key, self-consistent", () => {
    for (const key of MODULE_KEYS) {
      expect(MODULES[key].key).toBe(key);
      expect(MODULES[key].priceEnv).toMatch(/^STRIPE_PRICE_/);
      expect(MODULES[key].trialDays).toBeGreaterThan(0);
    }
  });

  it("maps each module to a distinct domain and route", () => {
    const domains = MODULE_KEYS.map((k) => MODULES[k].domain);
    const routes = MODULE_KEYS.map((k) => MODULES[k].route);
    expect(new Set(domains).size).toBe(MODULE_KEYS.length);
    expect(new Set(routes).size).toBe(MODULE_KEYS.length);
  });

  it("crew bundle grants every module", () => {
    expect([...BUNDLE_GRANTS.crew].sort()).toEqual([...MODULE_KEYS].sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/modules.test.ts`
Expected: FAIL — `Cannot find module './modules'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/modules.ts
/**
 * Modul-katalog — den statiske sandhed om tilkøbsmoduler.
 * Samme ånd som lib/stripe.ts / lib/pricing.ts: ren konfiguration,
 * ingen runtime-afhængigheder. Pris-opslag sker i lib/stripe.ts via
 * `priceEnv`. Domænefarver matcher data-domain-systemet (body/food/heart/mind).
 */
export type ModuleKey = "train" | "nutrition" | "hrv" | "mind";

export const MODULE_KEYS: readonly ModuleKey[] = [
  "train",
  "nutrition",
  "hrv",
  "mind",
] as const;

export type ModuleDef = {
  key: ModuleKey;
  domain: "body" | "food" | "heart" | "mind";
  route: string; // modulets gratis-gulv/root-rute
  labelKey: string; // i18n-nøgle i messages/{locale}/Modules.json
  priceEnv: string; // navn på env-var med Stripe price id
  trialDays: number; // Stripe trial_period_days ved checkout
};

export const MODULES: Record<ModuleKey, ModuleDef> = {
  train: {
    key: "train",
    domain: "body",
    route: "/coaching",
    labelKey: "train.label",
    priceEnv: "STRIPE_PRICE_TRAIN",
    trialDays: 7,
  },
  nutrition: {
    key: "nutrition",
    domain: "food",
    route: "/nutrition",
    labelKey: "nutrition.label",
    priceEnv: "STRIPE_PRICE_NUTRITION",
    trialDays: 7,
  },
  hrv: {
    key: "hrv",
    domain: "heart",
    route: "/hrv",
    labelKey: "hrv.label",
    priceEnv: "STRIPE_PRICE_HRV",
    trialDays: 7,
  },
  mind: {
    key: "mind",
    domain: "mind",
    route: "/mind",
    labelKey: "mind.label",
    priceEnv: "STRIPE_PRICE_MIND",
    trialDays: 7,
  },
};

/** Bundle-ekspansion: crew låser alle indholds-moduler op. */
export const BUNDLE_GRANTS: { crew: readonly ModuleKey[] } = {
  crew: MODULE_KEYS,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/modules.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules.ts src/lib/modules.test.ts
git commit -m "feat(modules): modul-katalog (ModuleKey, MODULES, BUNDLE_GRANTS)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Udvid `ProductKind` + hold `billing.ts` kompilerende

Stripe-unionen udvides og `priceIdFor()` lærer at slå modul-priser op. Samme commit fikser `billing.ts:37`, hvis `Record<ProductKind, …>`-literal ellers ville fejle at kompilere med den bredere union.

**Files:**
- Modify: `src/lib/stripe.ts`
- Modify: `src/lib/data/billing.ts:26-55`
- Test: `src/lib/stripe.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/stripe.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

// stripe.ts importerer "server-only" (ikke installeret; vitest kører i
// node-miljø uden alias for det). Uden denne mock loader testen slet
// ikke. Samme mønster som src/lib/coach/draft-reply-claude.smoke.test.ts.
vi.mock("server-only", () => ({}));

import { priceIdFor } from "./stripe";

describe("priceIdFor — moduler", () => {
  afterEach(() => {
    delete process.env.STRIPE_PRICE_TRAIN;
  });

  it("returnerer modul-pris fra env når sat", () => {
    process.env.STRIPE_PRICE_TRAIN = "price_train_123";
    expect(priceIdFor("train")).toBe("price_train_123");
  });

  it("returnerer null for modul uden env-pris", () => {
    delete process.env.STRIPE_PRICE_HRV;
    expect(priceIdFor("hrv")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stripe.test.ts`
Expected: FAIL (RED) — vitest transpilerer via esbuild uden type-tjek, så fejlen er en assertion-mismatch: den endnu-ikke-udvidede `priceIdFor("train")` returnerer `null`, så `expect(...).toBe("price_train_123")` fejler. (`server-only`-mocken sikrer at testen overhovedet loader; uden den er fejlen `Cannot find package 'server-only'`.)

- [ ] **Step 3: Implement — udvid `stripe.ts`**

I `src/lib/stripe.ts`: importér katalog, udvid unionen, tilføj modul-grenen i `priceIdFor`. Erstat den nuværende `ProductKind`-type og `priceIdFor`-funktion:

```ts
import { MODULES, type ModuleKey } from "./modules";

export type ProductKind = "crew" | "one_on_one" | ModuleKey;

export function priceIdFor(kind: ProductKind): string | null {
  if (kind === "crew") return STRIPE_PRICE_CREW || null;
  if (kind === "one_on_one") return STRIPE_PRICE_ONE_ON_ONE || null;
  // Modul-priser slås op på call-time via katalogets priceEnv.
  const def = MODULES[kind as ModuleKey];
  if (def) return process.env[def.priceEnv] || null;
  return null;
}
```

(Behold `import "server-only";`, `getStripe()`, `STRIPE_ENABLED` og de eksisterende `STRIPE_PRICE_*`-consts uændret.)

- [ ] **Step 4: Implement — compile-sikker `billing.ts`**

I `src/lib/data/billing.ts`, erstat `getActiveSubscriptions` så resultatet ikke længere kræver alle `ProductKind`-keys som literal:

```ts
export async function getActiveSubscriptions(
  memberId: string
): Promise<Partial<Record<ProductKind, ActiveSubscription>> | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("member_active_subscriptions")
    .select("product_kind, status, current_period_end, cancel_at_period_end")
    .eq("member_id", memberId);

  const result: Partial<Record<ProductKind, ActiveSubscription>> = {};

  for (const r of data ?? []) {
    const kind = r.product_kind as ProductKind;
    result[kind] = {
      productKind: kind,
      status: r.status as SubscriptionStatus,
      currentPeriodEnd: r.current_period_end,
      cancelAtPeriodEnd: !!r.cancel_at_period_end,
    };
  }

  return result;
}
```

(`billing/page.tsx` læser `subs?.crew ?? null` og `subs?.one_on_one ?? null` — begge type-tjekker uændret mod `Partial<Record<…>>`.)

- [ ] **Step 5: Run test + build to verify green**

Run: `npx vitest run src/lib/stripe.test.ts`
Expected: PASS (2 tests).

Run: `npm run build`
Expected: Build lykkes — ingen TS-fejl i `billing.ts` eller `billing/page.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stripe.ts src/lib/stripe.test.ts src/lib/data/billing.ts
git commit -m "feat(stripe): udvid ProductKind med moduler + compile-sikker billing.ts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Ren entitlement-resolver (`deriveEntitlements`)

Hjertet i modellen: en ren funktion fra aktive-sub-rækker til modul-entitlements. Udtømmende testet.

**Files:**
- Create: `src/lib/data/entitlements.ts` (kun den rene funktion + typer i dette task)
- Test: `src/lib/data/entitlements.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/data/entitlements.test.ts
import { describe, expect, it } from "vitest";
import { deriveEntitlements } from "./entitlements";

const NONE = { train: false, nutrition: false, hrv: false, mind: false };
const ALL = { train: true, nutrition: true, hrv: true, mind: true };

describe("deriveEntitlements", () => {
  it("ingen abonnementer → intet låst op", () => {
    expect(deriveEntitlements([])).toEqual(NONE);
  });

  it("enkeltmodul → kun det modul", () => {
    expect(deriveEntitlements([{ product_kind: "train" }])).toEqual({
      ...NONE,
      train: true,
    });
  });

  it("flere enkeltmoduler → summen", () => {
    expect(
      deriveEntitlements([{ product_kind: "train" }, { product_kind: "hrv" }])
    ).toEqual({ ...NONE, train: true, hrv: true });
  });

  it("crew-bundle → alt låst op", () => {
    expect(deriveEntitlements([{ product_kind: "crew" }])).toEqual(ALL);
  });

  it("crew vinder over delvise moduler", () => {
    expect(
      deriveEntitlements([{ product_kind: "train" }, { product_kind: "crew" }])
    ).toEqual(ALL);
  });

  it("one_on_one alene låser ingen indholds-moduler op", () => {
    expect(deriveEntitlements([{ product_kind: "one_on_one" }])).toEqual(NONE);
  });

  it("ukendt product_kind ignoreres", () => {
    expect(deriveEntitlements([{ product_kind: "mystery" }])).toEqual(NONE);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/entitlements.test.ts`
Expected: FAIL — `Cannot find module './entitlements'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/data/entitlements.ts
import { MODULE_KEYS, type ModuleKey } from "@/lib/modules";

export type Entitlements = Record<ModuleKey, boolean>;

const NONE: Entitlements = {
  train: false,
  nutrition: false,
  hrv: false,
  mind: false,
};
const ALL: Entitlements = {
  train: true,
  nutrition: true,
  hrv: true,
  mind: true,
};

/**
 * Ren afledning: aktive-sub-rækker → modul-entitlements.
 * Rækkerne kommer fra `member_active_subscriptions`, som allerede er
 * filtreret til trialing/active/past_due, så status ikke skal tjekkes her.
 * crew-bundlen ekspanderer til alle moduler; one_on_one og ukendte
 * kinds ignoreres.
 */
export function deriveEntitlements(
  rows: { product_kind: string }[]
): Entitlements {
  const e: Entitlements = { ...NONE };
  for (const r of rows) {
    if (r.product_kind === "crew") return { ...ALL };
    if ((MODULE_KEYS as readonly string[]).includes(r.product_kind)) {
      e[r.product_kind as ModuleKey] = true;
    }
  }
  return e;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/data/entitlements.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/entitlements.ts src/lib/data/entitlements.test.ts
git commit -m "feat(entitlements): ren deriveEntitlements-resolver + udtømmende tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Async-wrappere (`getEntitlements`, `requireModuleOrRedirect`)

Tynd glue oven på den rene funktion: request-memo'iseret Supabase-fetch (demo-mode → alt-true) og en rute-guard til premium-dybe-ruter. Ingen dedikeret unit-test (side-effektfuld glue, testes via Fase B's side-integration).

> **Rettelse under eksekvering (kvalitets-review):** kodeblokken nedenfor gatede demo-mode alene på manglende Supabase, men spec §5.4 kræver `!STRIPE_ENABLED` → alt-true. Som implementeret returnerer `getEntitlements` alt-true når **enten** Supabase **eller** Stripe-konfigurationen (`STRIPE_SECRET_KEY` + `STRIPE_PRICE_CREW`, læst call-time — ikke via `@/lib/stripe`, som er `server-only` og ville brække vitest) mangler. Derudover: query-fejl logges (`[entitlements]`-tag, stadig fail-closed), og `freeFloorRoute` defaulter til `MODULES[moduleKey].route`.

**Files:**
- Modify: `src/lib/data/entitlements.ts`

- [ ] **Step 1: Append implementation**

Tilføj øverst til `src/lib/data/entitlements.ts` de nødvendige imports, og nederst wrapperne:

```ts
// tilføj til imports øverst i filen:
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

// tilføj nederst i filen:

/**
 * Et medlems modul-entitlements. Request-memo'iseret via React cache(),
 * så gentagne kald (layout + sider + action-guards inden for samme
 * request) kun rammer DB én gang. Demo-mode (ingen Supabase) → alt-true,
 * så lokal udvikling ser fuldt indhold — samme filosofi som billing.ts.
 */
export const getEntitlements = cache(
  async (memberId: string): Promise<Entitlements> => {
    const supabase = await createClient();
    if (!supabase) return { ...ALL };

    const { data } = await supabase
      .from("member_active_subscriptions")
      .select("product_kind")
      .eq("member_id", memberId);

    return deriveEntitlements(data ?? []);
  }
);

/**
 * Rute-guard til premium-dybe-ruter uden gratis-ækvivalent.
 * Ikke logget ind → /login. Mangler modulet → redirect til modulets
 * gratis-gulv-rute med ?upsell=<key>. Kaldes øverst i server-siden.
 */
export async function requireModuleOrRedirect(
  moduleKey: ModuleKey,
  freeFloorRoute: string
): Promise<void> {
  const member = await getSession();
  if (!member) redirect("/login");
  const ent = await getEntitlements(member.id);
  if (!ent[moduleKey]) redirect(`${freeFloorRoute}?upsell=${moduleKey}`);
}
```

- [ ] **Step 2: Verify build + full test suite**

Run: `npm run build`
Expected: Build lykkes (imports af `react`, `next/navigation`, `@/lib/supabase/server`, `@/lib/auth` resolver; ingen TS-fejl).

Run: `npx vitest run src/lib/data/entitlements.test.ts`
Expected: PASS (uændret — de 7 tests af `deriveEntitlements`; wrapperne ændrer dem ikke).

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/entitlements.ts
git commit -m "feat(entitlements): getEntitlements (cache) + requireModuleOrRedirect

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Migration `0055_module_entitlements.sql`

Udvider `product_kind`-CHECK til modulerne og opretter `member_module_trials` (bruges først af webhooken i Fase C, men skemaet lander nu så fundamentet er komplet).

**Files:**
- Create: `supabase/migrations/0055_module_entitlements.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =================================================================
-- MakeIt // HQ — modul-entitlements (Fase A)
-- =================================================================
-- Udvider subscriptions.product_kind med de fire tilkøbsmoduler og
-- tilføjer member_module_trials (anti-abuse for pr.-modul trial).
-- member_module_trials skrives kun af webhooken (service role);
-- klienter læser kun egne rækker (RLS).

-- ---------------------------------------------------------------- *
-- 1) Udvid product_kind-CHECK: crew/one_on_one + train/nutrition/hrv/mind
-- ---------------------------------------------------------------- *
alter table public.subscriptions
  drop constraint if exists subscriptions_product_kind_check;

alter table public.subscriptions
  add constraint subscriptions_product_kind_check
  check (product_kind in (
    'crew', 'one_on_one', 'train', 'nutrition', 'hrv', 'mind'
  ));

-- ---------------------------------------------------------------- *
-- 2) member_module_trials — ét trial pr. (medlem, modul)
-- ---------------------------------------------------------------- *
create table if not exists public.member_module_trials (
  member_id        uuid not null references public.members(id) on delete cascade,
  module_kind      text not null check (module_kind in ('train','nutrition','hrv','mind')),
  first_trialed_at timestamptz not null default now(),
  primary key (member_id, module_kind)
);

alter table public.member_module_trials enable row level security;

create policy "module_trials: own read"
  on public.member_module_trials for select
  to authenticated
  using (member_id = auth.uid());

create policy "module_trials: coach read"
  on public.member_module_trials for select
  to authenticated
  using (public.is_current_user_coach());

-- (Ingen insert/update/delete-policies for klient-roller — webhooken
--  bruger service-role, som bypasser RLS. Samme mønster som 0005.)
```

- [ ] **Step 2: Verify the migration applies (lokal Supabase)**

Run: `npm run db:start` (hvis ikke allerede kørende), derefter `npm run db:reset`
Expected: Alle migrationer 0001→0055 kører uden fejl; `member_module_trials` oprettes; CHECK-constraint erstattes.

Fallback hvis lokal Supabase ikke er tilgængelig: verificér SQL-syntaks med `npm run db:lint` eller manuel gennemgang mod `0005_subscriptions.sql`. **Kør ikke mod live DB** (jf. loose-ends: password-rotation + db:types blokker).

Note: `npm run db:types` er **ikke** nødvendig i Fase A — ingen kode her læser `member_module_trials` (kun webhooken i Fase C gør).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0055_module_entitlements.sql
git commit -m "feat(db): migration 0055 — udvid product_kind + member_module_trials

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Dokumentér env-vars + final gate

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add module price env-vars to `.env.example`**

Find den eksisterende Stripe-blok (`STRIPE_PRICE_CREW`, `STRIPE_PRICE_ONE_ON_ONE`) og tilføj under den:

```bash
# Modul-priser (Fase A/C) — Stripe recurring price ids pr. tilkøbsmodul.
# Tomme i demo-mode; entitlement-resolveren giver alt-true uden Supabase.
STRIPE_PRICE_TRAIN=
STRIPE_PRICE_NUTRITION=
STRIPE_PRICE_HRV=
STRIPE_PRICE_MIND=
```

- [ ] **Step 2: Final verification gate**

Run: `npx vitest run src/lib/modules.test.ts src/lib/stripe.test.ts src/lib/data/entitlements.test.ts`
Expected: PASS (alle — 3 + 2 + 7 = 12 tests).

Run: `npm run build`
Expected: Build lykkes, ingen TS-fejl.

Run: `npm run lint`
Expected: Ingen nye lint-fejl i de rørte filer.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): dokumentér modul-pris env-vars (STRIPE_PRICE_*)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Fase A — Definition of Done

- [ ] `src/lib/modules.ts` katalog + invariant-tests grønne.
- [ ] `ProductKind` udvidet med de fire moduler; `priceIdFor()` slår modul-priser op; `billing.ts` kompilerer under den bredere union.
- [ ] `deriveEntitlements` udtømmende testet (7 cases); `getEntitlements` (cache) + `requireModuleOrRedirect` implementeret.
- [ ] Migration `0055` kører rent lokalt.
- [ ] `.env.example` dokumenterer modul-pris-vars.
- [ ] `npm run build` + hele test-suiten grøn. **Ingen synlig UI-ændring** (fundament kun).

**Næste:** Fase B (gratis-gulv-rendering + `<ModuleUpsell>` + side-forgrening/guards) får sin egen plan.
