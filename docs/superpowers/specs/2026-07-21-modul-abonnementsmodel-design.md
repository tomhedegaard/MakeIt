# Modul-abonnementsmodel — gratis start + tilkøbsmoduler (freemium + à la carte + bundle)

**Date:** 2026-07-21 · **Spec revision:** 2
**Status:** Draft (design) — afventer brugerens spec-review før planlægning
**Rev. 2:** layout-baseret håndhævelse + eksplicit premium-rute-inventar (§6.4); compile-sikker `billing.ts`-touch i Fase A; webhook-default-hærdning; `cache()` på resolver.
**Phase:** Monetiseringsmodel v1 — introducerer et **entitlement-lag** oven på den eksisterende Stripe-spine
**Module path:** ny `src/lib/modules.ts`, ny `src/lib/data/entitlements.ts`, ny migration `0055_module_entitlements.sql`, udvider `src/lib/stripe.ts` + Stripe-webhook + hver søjle-side + `/billing` + i18n

> Strategisk kontekst: I dag er alt bag login åbent — der findes ingen betalings-gating, kun to Stripe-produkter (`crew`, `one_on_one`) der intet låser. Denne model gør MakeIt gratis at komme i gang med (permanent gratis-gulv på tværs af alle søjler) og lader medlemmet **tilkøbe præcis de moduler det vil have** — Træning, Kost, HRV, Mental — enkeltvis (à la carte) med 7-dages trial pr. modul, eller samlet i `crew`-bundlen med rabat. Menneske-coaching (`one_on_one`) forbliver et separat add-on. Modellen genbruger hele den eksisterende `subscriptions`-tabel + webhook; det eneste nye er et tyndt, testbart entitlement-resolver-lag og en gratis/fuld-forgrening i hver søjle.

---

## 0. References to existing codebase (verified)

| Artifact | Path | Status / hvordan modellen bruger det |
|---|---|---|
| Subscriptions-tabel | `supabase/migrations/0005_subscriptions.sql` — `subscriptions(member_id, stripe_subscription_id, product_kind, status, current_period_end, cancel_at_period_end, …)` | Shipped — `product_kind` CHECK udvides fra `('crew','one_on_one')` til også `('train','nutrition','hrv','mind')`. Ét medlem kan have flere aktive rækker (én pr. modul). |
| Active-subs view | `supabase/migrations/0005_subscriptions.sql` — `member_active_subscriptions` (status in `trialing/active/past_due`) | Shipped — **rører vi ikke**. Inkluderer allerede `trialing`, som resolveren tæller som adgang. Resolveren læser alle rækker for medlemmet. |
| Stripe env-gate + client | `src/lib/stripe.ts` — `ProductKind = "crew" \| "one_on_one"`, `priceIdFor()`, `STRIPE_ENABLED` | Shipped — `ProductKind` udvides med de fire moduler; `priceIdFor()` mapper nye env-vars (`STRIPE_PRICE_TRAIN/_NUTRITION/_HRV/_MIND`). Demo-mode-mønster genbruges. |
| Stripe-webhook | `src/app/api/stripe/webhook/route.ts:95,111` — læser `sub.metadata.product_kind`, upserter `product_kind` generisk | Shipped — skriver allerede `product_kind` fra metadata → moduler virker **uden** ændring i skrive-logikken. Udvides kun til at logge trial-start i `member_module_trials`. |
| Checkout + portal actions | `src/app/(app)/billing/actions.ts` — `startCheckoutAction(kind)`, `openPortalAction()` | Shipped — `startCheckoutAction` tager allerede `kind` fra formdata; udvides med `subscription_data.trial_period_days` (opslået i modul-katalog + anti-abuse-tjek). |
| Billing-side | `src/app/(app)/billing/page.tsx` — crew- + one_on_one-kort, `isNativeRequest()`-gren der skjuler købs-UI | Shipped — bygges om til modul-kort (Fase C). Native status-only-grenen genbruges 1:1 for moduler. |
| Billing data | `src/lib/data/billing.ts` — `getActiveSubscriptions()` (fast-formet Record over 2 kinds) | Shipped — får følgeskab af ny `getEntitlements()`; den gamle funktion kan blive stående til billing-status eller refaktoreres i Fase C. |
| Auth / middleware | `src/middleware.ts` — auth-only route-beskyttelse (login-redirect) | Shipped — **rører vi ikke**. Entitlements er per-feature, ikke per-rute; gratis-gulvet bor på samme rute. |
| Reps-gamification-tier | `src/lib/auth.ts:21` — `Tier = "Lifter" \| "Athlete" \| "Beast" \| "Legend"` | Shipped — **dette er IKKE en abonnements-tier.** Specen holder "tier" (Reps-status) og "modul" (betalt adgang) skarpt adskilt. Ingen ændring her. |
| Tier-banner | `src/components/app/TierBanner.tsx` → linker `/reps` | Shipped — Reps-promotions-banner, **ikke** billing-upsell. Vi laver en dedikeret `ModuleUpsell`-komponent i stedet; TierBanner genbruges ikke. |
| App-nav (8 søjler) | `src/components/app/AppShell.tsx:13-20`, `MobileTabBar.tsx:84-90` | Shipped — søjle→modul-mapping i §4. Domænefarver (`body/food/heart/mind`) mapper 1:1 til de fire betalte moduler. |
| Domænefarvesystem | tokens + `data-domain`-mønster (PR #22) | Shipped — modul-kort og upsell farvekodes efter domæne. |
| Native-detektion | `src/lib/platform-server.ts` — `isNativeRequest()` | Shipped — native shells sælger intet (Apple 3.1.1); genbruges til at gate al købs-/trial-UI. |
| Pricing-copy | `src/lib/pricing.ts` — placeholder-beløb (`[XX]`, `[ZZ]`) | Shipped — udvides med pr.-modul- og bundle-beløb. Faktiske tal er et forretningsinput sat ved launch, ikke et spec-hul. |
| i18n | `src/i18n/config.ts` (da, en) + `messages/{locale}/*.json` | Shipped — ny `Modules.json` + udvidet `Billing.json`. |

**Kritisk genbrugs-indsigt:** `subscriptions` + webhook + checkout/portal + native-gating + demo-mode + domænefarver er alle modne. Den nye overflade er kun: (1) én migration `0055` (udvid `product_kind`-CHECK + `member_module_trials`); (2) `lib/modules.ts` (katalog) + `lib/data/entitlements.ts` (resolver); (3) en fuld/gratis-gulv-forgrening + `ModuleUpsell` i hver søjle; (4) trial + modul-kort i checkout/billing.

---

## 1. Overview & positioning

MakeIt skal være **gratis at starte med og billigt at vokse ind i**. En ny bruger får et permanent, brugbart gratis-gulv på tværs af alle søjler — nok til at træne og spise efter appen fra dag ét — og betaler først når det vil have den fulde, adaptive maskine i et givet domæne.

Modellen gør tre ting reelle:

1. **Gratis start-abonnement (permanent gulv).** Hvert medlem har som default adgang til: ét færdigt kickstart-træningsprogram, én eksempel-kostplan med manuel logging, HRV manuel dags-score, mental intro-indhold, fuldt Fællesskab, fuld Reps og fuld Science. Ingen tidsgrænse.
2. **Tilkøbsmoduler à la carte.** Fire betalte moduler — **Træning**, **Kost**, **HRV**, **Mental** — kan tilkøbes enkeltvis, hver med **7-dages gratis trial**. Hvert modul låser sit domænes fulde funktionalitet op (adaptive motor, fuldt bibliotek, wearable-sync osv. — se §4).
3. **Bundle + menneske-lag.** `crew` "Hele holdet" = alle fire moduler + fuldt Fællesskab, samlet med rabat. `one_on_one` = menneske-coaching-add-on (kræver crew eller ≥1 modul). Begge er reframe/behold af eksisterende produkter.

**Hvorfor det passer arkitekturen.** Betalings-spinen findes allerede; det der manglede var (a) begrebet "gratis medlem" og (b) et entitlement-lag der oversætter aktive abonnementer til "hvilke moduler ejer dette medlem". Vi bygger netop de to ting og ikke mere.

---

## 2. Goals & non-goals

### Goals (v1)

- **Gratis medlem er et førsteklasses begreb.** Et medlem uden aktivt betalt abonnement kan bruge appen permanent via gratis-gulvet — ingen tidsgrænse, ingen paywall for at logge ind.
- **Fire betalte moduler** (`train`, `nutrition`, `hrv`, `mind`) kan tilkøbes enkeltvis via Stripe Checkout, hver med 7-dages trial (ikke gentageligt pr. modul pr. medlem).
- **`crew`-bundle** ekspanderer til alle fire moduler; `one_on_one` forbliver uændret human add-on.
- **Entitlement-resolver** (`getEntitlements(memberId)`) er ét sandhedspunkt afledt af aktive abonnementer, med `trialing` = adgang, og demo-mode = alt-true.
- **Hver søjle renderer fuld vs. gratis-gulv** ud fra entitlements, med en dedikeret `ModuleUpsell`-flade på gulvet. Server-actions guardes så gating ikke kan bypasses.
- **Native shells sælger intet** — kun modul-status + "Administrér på web".
- **Reps-loop bevares gratis:** gratis-gulv-handlinger optjener Reps; kun modul-eksklusive optjeningskilder kræver modulet.

### Non-goals (v1)

- **Native StoreKit / Google Play Billing IAP** — køb sker på web. Native IAP er en fremtidig fase (jf. Apple 3.1.1), eksplicit uden for scope.
- **Faste pakke-tiers (Free/Plus/Pro)** — fravalgt til fordel for à la carte + én bundle.
- **Admin-redigerbar pris-/katalog-UI** — kataloget er kode (`lib/modules.ts`); ingen DB-drevet produktadministration i v1.
- **Proration-/opgraderings-flows ud over Stripes standard** — Stripe Customer Portal håndterer skift/annullering; ingen custom proration-logik.
- **Gating af Fællesskab, Reps, Science, Dashboard** — de forbliver gratis (retention/kredibilitet). Posting i Fællesskab er åbent (flipbart default, §12).
- **Endelige prisbeløb** — struktur specificeres her; beløb er et forretningsinput i `lib/pricing.ts` ved launch.

---

## 3. Model shape (låste beslutninger)

Fastlagt i brainstorm forud for denne spec:

1. **Freemium + à la carte moduler + bundle** (ikke faste tiers, ikke ren à la carte).
2. **Permanent gratis-gulv + trial pr. modul** (7 dage, Stripe `trial_period_days`).
3. **Entitlement-arkitektur ①:** afledte entitlements fra udvidet `product_kind` + statisk katalog i `lib/`. Ét sandhedspunkt = `subscriptions`-tabellen. (Fravalgt: fulde DB-katalog/entitlement-tabeller ②, og feature-grant-tabel ③.)

---

## 4. Modul-katalog & gratis-gulv-matrix

De 8 nav-søjler mappet ind i modellen. Domænefarve i parentes.

| Søjle (rute) | Rolle i modellen | Gratis-gulv (permanent) | Betalt låser op |
|---|---|---|---|
| 02 Træning `/coaching` 🟥 (body) | **Modul `train`** | 1 kickstart-program (fx 2 uger), demo-øvelser | Adaptive program-motor, fuldt øvelsesbibliotek + 3D/demoer, form-check, progression, Munk-multiplier |
| 03 Kost `/nutrition` 🟩 (food) | **Modul `nutrition`** | 1 eksempel-kostplan + manuel logging | Adaptive kostplaner, meal-prep-mode, billed-logging, reps-drevne justeringer, skip-days |
| 05 HRV `/hrv` 🟦 (heart) | **Modul `hrv`** | Manuel dags-score | Wearable-sync, trends, lifestyle-korrelationer, milestones |
| 06 Mind `/mind` 🟪 (mind) | **Modul `mind`** | Intro-indhold / mini-forløb | Fuld mental søjle, cirkler-posts, hero-forløb, AI mental coach |
| 04 Fællesskab `/community` | Gratis (gates ikke) | Fuld læse + åben posting | — |
| 07 Reps `/reps` | Gratis (gates ikke) | Fuld — optjeningskilder følger ejede moduler | — |
| 08 Science `/science` | Gratis (gates ikke) | Fuld (også kredibilitet/SEO-feed) | — |
| 01 Dashboard `/dashboard` | Gratis hub | Status + upsell pr. domæne | — |

**Bundle & menneske-lag:**
- **`crew` "Hele holdet"** — alle fire moduler + fuldt Fællesskab, rabatteret vs. at købe modulerne enkeltvis. (Reframe af eksisterende `crew`.)
- **`one_on_one`** — menneske-coaching-add-on, uændret. Giver **ikke** i sig selv indholds-moduler. "Kræver crew eller ≥1 modul" er i v1 **informativt** (samme som dagens `t("oneOnOne.requiresCrew")`-note), ikke håndhævet i checkout — hård-håndhævelse er flipbar (§13).

**Bærende princip:** gating sker **i-siden, ikke i middleware**. Samme rute (`/nutrition` osv.) renderer enten fuld eller gratis-gulv-udgave + `ModuleUpsell`. `middleware.ts` forbliver auth-only.

---

## 5. Datamodel & entitlement-resolver

### 5.1 Migration `0055_module_entitlements.sql`

- **Udvid CHECK** på `subscriptions.product_kind`:
  drop eksisterende constraint, tilføj ny:
  `check (product_kind in ('crew','one_on_one','train','nutrition','hrv','mind'))`.
- **Ny tabel `member_module_trials`** — forhindrer gentaget trial af samme modul pr. medlem:
  ```
  member_module_trials (
    member_id    uuid not null references members(id) on delete cascade,
    module_kind  text not null check (module_kind in ('train','nutrition','hrv','mind')),
    first_trialed_at timestamptz not null default now(),
    primary key (member_id, module_kind)
  )
  ```
  RLS: eget-læse (`member_id = auth.uid()`) + coach-read; skrives kun af service-role (webhook), som i `subscriptions`.
- **`member_active_subscriptions`-viewet ændres ikke.**

### 5.2 `src/lib/modules.ts` (nyt — katalog, ren kode)

Statisk katalog i samme ånd som `lib/stripe.ts`/`lib/pricing.ts`:

```
export type ModuleKey = "train" | "nutrition" | "hrv" | "mind";

export const MODULES: Record<ModuleKey, {
  key: ModuleKey;
  domain: "body" | "food" | "heart" | "mind";
  route: string;            // "/coaching", "/nutrition", "/hrv", "/mind"
  labelKey: string;         // i18n-nøgle i Modules.json
  priceEnv: string;         // "STRIPE_PRICE_TRAIN" osv.
  trialDays: number;        // 7
}>;

// Bundle-ekspansion: crew → alle fire keys.
export const BUNDLE_GRANTS: Record<"crew", ModuleKey[]>;
```

### 5.3 `src/lib/stripe.ts` (udvid)

- `ProductKind` union udvides: `"crew" | "one_on_one" | ModuleKey`.
- `priceIdFor(kind)` udvides til at slå modul-priser op via `MODULES[kind].priceEnv` (og beholde crew/one_on_one).
- Nye env-vars dokumenteres i `.env.example`: `STRIPE_PRICE_TRAIN`, `STRIPE_PRICE_NUTRITION`, `STRIPE_PRICE_HRV`, `STRIPE_PRICE_MIND`.
- **Compile-sikkerhed:** `src/lib/data/billing.ts:37` initialiserer `Record<ProductKind, …> = { crew: null, one_on_one: null }`. Når `ProductKind` udvides til seks værdier, fejler den literal at kompilere (manglende keys). Derfor **skal `billing.ts` have en minimal touch i samme fase som union-udvidelsen** (Fase A): enten gør returtypen `Partial<Record<ProductKind, …>>` og byg mappen dynamisk, eller behold den fast-formede funktion men initialisér kun de to billing-relevante keys via en eksplicit type der ikke kræver alle seks. Dette holder `npm run build` grøn gennem hele fasen.

### 5.4 `src/lib/data/entitlements.ts` (nyt — resolver)

```
export type Entitlements = Record<ModuleKey, boolean>; // { train, nutrition, hrv, mind }

export async function getEntitlements(memberId: string): Promise<Entitlements>;
```

**Regler:**
- Demo-mode (`!STRIPE_ENABLED`) → alle `true` (samme filosofi som i dag: lokal udvikling ser fuldt indhold).
- Ellers: læs alle rækker fra `member_active_subscriptions` for medlemmet.
  - Enhver `crew`-række (active/trialing/past_due) → alle fire `true` (bundle-ekspansion).
  - Enhver modul-række → den `ModuleKey` = `true`.
  - `one_on_one` påvirker ikke indholds-entitlements.
- `trialing` behandles som fuld adgang (viewet inkluderer det allerede).

Resolveren er en **ren funktion over aktive abonnementer** — ingen materialiseret kopi der kan drifte. Unit-testbar med et fixture-sæt af sub-rækker.

---

## 6. Håndhævelse (enforcement)

Et modul spænder over **flere ruter**, ikke kun sin root. En root-side-forgrening alene lader en gratis-bruger deep-linke direkte til premium-dybe-ruter (fx `/hrv/trends`, `/mind/sessions`, `/session/[id]`). Derfor er håndhævelsen tre-laget: (1) entitlement resolves **én gang pr. request i modulets `layout.tsx`**, (2) hver side beslutter fuld/gratis-gulv/upsell, (3) mutationer guardes uafhængigt.

### 6.1 Layout-resolution (én gang pr. request)

Hvert modul har allerede en `layout.tsx` (`coaching/`, `nutrition/`, `hrv/`, `mind/`, `train/`, `program/`). Layoutet er entitlement-resolutionens naturlige punkt for hele subtræet. `getEntitlements()` wrappes i React `cache()`, så root-side, dybe-sider og action-guards inden for samme request kun rammer DB én gang — ingen prop-drilling nødvendig, hver server-komponent kalder resolveren direkte og får det memo'iserede svar.

Layoutet **blokerer ikke** subtræet blindt (så ville det også skjule root-gratis-gulvet). Det resolver kun; hver side afgør sin egen rendering (§6.2).

### 6.2 Pr.-side-beslutning: fork vs. guard

To rute-typer, jf. inventaret i §6.4:

- **Root-ruter med gratis-gulv** (fx `/nutrition`, `/hrv`, `/mind`, `/coaching`): forgren fuld vs. gratis-gulv.
  ```
  const ent = await getEntitlements(member.id);
  if (!ent.nutrition) return <NutritionFreeFloor />; // + <ModuleUpsell moduleKey="nutrition" />
  // ellers fuld udgave
  ```
- **Premium-dybe-ruter uden gratis-ækvivalent** (fx `/hrv/trends`, `/mind/sessions`, `/session/[id]`): guard øverst i server-siden med en delt helper:
  ```
  await requireModuleOrRedirect("hrv", "/hrv"); // ikke entitlet → redirect til root (gratis-gulv + upsell)
  ```
  `requireModuleOrRedirect(moduleKey, freeFloorRoute)` bor i `lib/data/entitlements.ts`, bruger den `cache()`-memo'iserede resolver, og redirecter til modulets root med `?upsell=<key>`.

- `<ModuleUpsell moduleKey>` — dedikeret ny komponent (**IKKE** TierBanner, som er en Reps-promotions-banner). Farvekodet efter modulets domæne. Web: CTA → checkout m. trial. Native: CTA → "Administrér på web" (ingen pris/checkout).
- Gratis-gulv-komponenter (`*FreeFloor`) renderer den kuraterede delmængde fra §4.

### 6.3 Action-guards (bypass-sikring)

Da middleware ikke gater, skal **hver modul-eksklusiv server-action** guardes uafhængigt af side-rendering:

```
const ent = await getEntitlements(member.id);
if (!ent.train) return { error: "module_required", moduleKey: "train" };
```

Gælder mutationer som "generér adaptiv plan", "tilknyt wearable", "opret cirkel-post" osv. Free-floor-actions (log måltid manuelt, manuel HRV-score) er ikke guardede.

### 6.4 Premium-rute-inventar (verificeret mod kodebasen)

Hver betalt modul-nøgle → de ruter der gates. **Root** = fuld/gulv-fork; **dyb** = `requireModuleOrRedirect`; **action** = guard i §6.3.

| Modul | Root (fork) | Premium-dybe-ruter (guard-redirect) | Actions |
|---|---|---|---|
| `train` | `/coaching` | `/train/exercises`, `/session/[id]`, `/program/[code]`¹ | `form-check`, program-generering |
| `nutrition` | `/nutrition` | `/nutrition/preferences`, `/nutrition/setup`, `/nutrition/shopping` | plan-generering, billed-logging |
| `hrv` | `/hrv` | `/hrv/insights`, `/hrv/trends`, `/hrv/learn`² | wearable-tilknytning |
| `mind` | `/mind` | `/mind/{today,sessions,cirkler,journal,weekly,check}` | cirkel-post, session-completion |

¹ `program/[code]` = join-via-kode; hvis dette skal forblive åbent for coach-delte programmer, undtages det eksplicit (flipbart, §13). ² `/hrv/learn` er edukativt og kan vælges som gratis-gulv i stedet for guard (§13). `/mind/{settings,onboarding}` forbliver tilgængelige (konto/opsætning), ikke premium-gated.

### 6.5 Reps-optjening

Optjeningskilder knyttet til **modul-eksklusive** features kræver modulet; gratis-gulv-handlinger optjener altid (habit-loop bevares). Konkret: eksisterende `awardReps`-kaldesteder i modul-eksklusive flows får et entitlement-tjek; free-floor-kaldesteder ændres ikke.

---

## 7. Stripe, trials & anti-abuse

- **Checkout:** `startCheckoutAction(formData)` (læser `kind` fra formdata, som i dag) udvides — for `ModuleKey` sættes `subscription_data.trial_period_days = MODULES[kind].trialDays`, medmindre medlemmet allerede har en `member_module_trials`-række for det modul (så: ingen trial, direkte betaling). crew/one_on_one uændret.
- **Webhook:** ved `customer.subscription.created` med `status = 'trialing'` og et modul-`product_kind` → upsert `member_module_trials(member_id, module_kind)`. Skrive-logikken for `subscriptions` er allerede generisk over `product_kind`.
- **Webhook-default-hærdning:** `route.ts:95` defaulter i dag et manglende `metadata.product_kind` til `"crew"`. Under den nye model giver `crew` **alle fire moduler** — så en manglende/forkert metadata ville over-tildele. Checkout sætter altid metadata, så risikoen er lav, men defaulten ændres til en ikke-tildelende værdi (fx spring upsert over + log en advarsel) frem for `"crew"`.
- **Portal:** uændret — Stripe Customer Portal håndterer skift/annullering/genoptagelse pr. abonnement.
- **Bundle-interaktion:** hvis et medlem har enkeltmoduler og opgraderer til `crew`, håndteres det som separate abonnementer; entitlement-resolveren giver stadig korrekt alt-true via crew. (Oprydning i overlappende enkeltmodul-subs er en manuel/portal-beslutning, ikke automatiseret i v1 — noteret som bevidst forenkling.)

---

## 8. iOS / App Store

- **Native (`isNativeRequest()` true):** ingen priser, ingen checkout, ingen trial-start. Billing-siden viser modul-status ("Aktiv" / "Ikke aktiv" / "Trial — udløber d. X") + "Administrér på web". Ejet indhold renderer fuldt på native. Dette genbruger den eksisterende native-gren i `billing/page.tsx`.
- **Web:** fuld købs-/trial-oplevelse via Stripe Checkout.
- **Flag (bevidst):** Apple guideline 3.1.1 kan på sigt kræve StoreKit-IAP for in-app-oplåsning af digitalt indhold. v1 er web-først, konsistent med den allerede-trufne "native sælger intet"-beslutning. Native IAP = fremtidig fase, uden for scope.

---

## 9. Terminologi (undgå "tier"-kollision)

`Tier` (`Lifter/Athlete/Beast/Legend`) er **Reps-optjent gamification-status** og har intet med betaling at gøre. Denne model bruger konsekvent:
- **Modul** = en betalt enhed (`train/nutrition/hrv/mind`).
- **Entitlement** = "medlemmet ejer modul X".
- **Bundle** = `crew` (alle moduler).
- **Add-on** = `one_on_one` (menneske-coaching).
- **Gratis-gulv** = den permanente gratis delmængde.

Ingen ny brug af ordet "tier" i billing-/modul-kode.

---

## 10. Faset udrulning

Hver fase er selvstændigt testbar og efterlader appen i en fungerende tilstand.

- **Fase A — Entitlement-fundament (ingen priser live).**
  Migration `0055`; `lib/modules.ts`; `lib/stripe.ts`-udvidelse (+ **compile-sikker `billing.ts`-touch i samme fase**, jf. §5.3, så `ProductKind`-udvidelsen ikke brækker build); `lib/data/entitlements.ts` med `cache()`-wrappet resolver (demo=alt-true) + `requireModuleOrRedirect`. Unit-tests for resolveren. Ingen UI-ændring endnu — appen ser uændret ud, men fundamentet står, og `npm run build` er grøn.
- **Fase B — Gratis-gulv-rendering + upsell.**
  `*FreeFloor`-komponenter + `<ModuleUpsell>` pr. betalt søjle; page-forgrening; action-guards. Stadig demo=alt-true, så alt er åbent lokalt, men gulv/fuld-strukturen er på plads og testes med et fremtvunget ikke-entitlet fixture.
- **Fase C — Stripe-priser + trials + billing-revamp.**
  Opret 4 modul-priser + crew-bundle i Stripe; env-vars; per-modul checkout m. trial + anti-abuse; webhook skriver `member_module_trials`; billing-side bygges om til modul-kort; native status-only bekræftet.
- **Fase D — Reps-gating + analytics + polish.**
  Entitlement-tjek på modul-eksklusive optjeningskilder; konverterings-tracking (trial-start, trial→betalt, modul→bundle); dashboard-upsell pr. domæne; i18n-finish.

Hver fase får sit eget plan→implementering-cyklus i writing-plans-fasen.

---

## 11. Testing

- **Resolver (Fase A):** unit-tests over fixture-sub-sæt — gratis (ingen subs) → alt false; enkeltmodul → kun den key; crew → alt true; trialing → adgang; demo-mode → alt true; `one_on_one` alene → alt false.
- **Enforcement (Fase B):** komponent-/integrationstest at ikke-entitlet page renderer `*FreeFloor` + `ModuleUpsell`, og at guardede actions returnerer `module_required`.
- **Trials/anti-abuse (Fase C):** test at anden checkout af samme modul ikke sætter `trial_period_days` når `member_module_trials`-række findes; webhook-test at trialing-modul skriver trial-rækken.
- **Native (Fase C):** test at `isNativeRequest()`-gren ikke renderer pris/checkout for moduler.
- Følger husets eksisterende vitest-opsætning (`npm test`).

---

## 12. i18n

- Ny `messages/{da,en}/Modules.json` — modul-labels, gratis-gulv-forklaringer, upsell-copy, trial-copy.
- Udvid `Billing.json` — modul-kort, status-labels (inkl. "trial udløber").
- Al ny bruger-tekst gennem `next-intl`, da + en, som resten af appen.

---

## 13. Åbne beslutninger (flipbare defaults)

Disse er sat som defaults og kan ændres med ét flag i `lib/modules.ts` / copy uden arkitektur-ændring:

1. **Mind som betalt modul** (default: ja; gratis-gulv = intro). Alternativ: gør hele mental-søjlen gratis som konverterings-krog.
2. **Fællesskab-posting åben** (default: ja). Alternativ: gate posting bag ethvert ejet modul.
3. **Trial-længde = 7 dage** pr. modul. Justerbar pr. modul via `trialDays`.
4. **`one_on_one` giver ikke indholds-moduler** (default). Alternativ: lad 1:1 inkludere crew-bundlen.
5. **`one_on_one`-precondition informativ** (default: ikke håndhævet i checkout). Alternativ: hård-håndhæv "kræver crew eller ≥1 modul".
6. **`/program/[code]` gated som train-premium** (default). Alternativ: hold åben for coach-delte programmer via kode.
7. **`/hrv/learn` guardes** (default). Alternativ: gør det edukative indhold til gratis-gulv.
8. **Prisbeløb** — forretningsinput i `lib/pricing.ts` ved launch (struktur er specificeret; tal er ikke).

---

## 14. Out of scope (v1)

- Native StoreKit / Play Billing IAP.
- Faste pakke-tiers (Free/Plus/Pro).
- Admin/DB-drevet produkt- eller pris-administration.
- Custom proration ud over Stripe Portal.
- Automatisk oprydning af overlappende enkeltmodul-subs ved bundle-opgradering.
- Gating af Dashboard, Fællesskab, Reps, Science.
