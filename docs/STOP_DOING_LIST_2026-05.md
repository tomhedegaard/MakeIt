# Stop-doing list — focus the 6 mdr på de fire søjler

**Dato:** 2026-05-25 · **Status:** Triage færdig, beslutninger udestår
**Reference:** [`~/.claude/plans/hvis-vi-skal-have-dreamy-spring.md`](../../.claude/plans/hvis-vi-skal-have-dreamy-spring.md)

---

## TL;DR

Kodebasen er overraskende ren — **0 TODO/FIXME** i `src/`, ingen halv-færdig kode på trunk, kun én gammel stash. Sidste 30 dages 256 commits er overvejende HRV (119) + Coach (13) + Nutrition (12) — pænt centreret om de pillars vi nu doubler down på.

**Tre handlinger:**
1. Merge HRV V2.5 worktree (er færdig, blot skal landes)
2. Marker 6 features som "deferred v2" (de er ikke pillars og må ikke spise tid)
3. Slet den gamle stash ("pre-trunk-pull untracked backup")

---

## In-flight: én ting at lande

| Item | Status | Action |
|---|---|---|
| `.worktrees/hrv-v2-5-reps-milestones` | "V2.5 verification — complete" | **MERGE** (afventer kun rebase + PR) |

---

## Deferred til v2 — ikke pillars

Disse rører vi ikke i 6-mdr horisonten. Hvis impulsen kommer til at "lige fixe X", reference dette dokument.

| Feature | Hvor det er nu | Hvorfor defer |
|---|---|---|
| **Shopify Storefront bridge** | Planlagt, ikke startet | E-commerce er ikke wauw-vektor; Reps-shoppen kan leve i v1 som intern surface |
| **Custom domain `hq.nowmakeit.eu`** | Planlagt, ikke konfigureret | Lavt-friktion post-launch; intet wauw-bidrag |
| **Realtime Supabase channels** | Plumbed (channels-config eksisterer), ikke deployed | HTTP polling er nok for community + buddy. Realtime giver UX-gloss, ikke wauw |
| **Backlog admin system** (`/coach/system`) | Tom skema, RLS opsætning | Build det når vi har post-M6 backlog at tracke |
| **`member_action_logs` udvidet** | Eksisterer med fast enum | Lad være med at udvide — adaptive engine bruger `hrv_session_modifiers` i stedet |
| **Push notifications generelt** | Plumbed (`sendPushToMember`), kun udvalgte triggers wired | Holder på adaptation-audit + co-coach-eskalation; ingen generel "engagement push" |
| **Multi-coach support (eksternt)** | Ikke startet | Crew-pyramiden er svaret. Coaches er crew, ikke uafhængige operatører |
| **Native iOS app (fuld)** | Ikke startet | PWA + Apple Watch (M5) dækker; fuld native er post-M6 |
| **Kalender-booking / live-classes** | Ikke startet | Ikke det vi skal være kendt for |
| **Group challenges v2** | v1 lever i community-feed | v1 er nok til M6 |
| **Resend production email finish** | Halvbygget — coach review path eksisterer, andre paths ikke wired | **Undtagelse:** færdiggør som "bridge" — bruges af adaptation-digest og co-coach pipeline |

---

## "Bridge" — halve features der skal lukkes for at låse pillars

Disse må ikke vokse, men skal lige lukkes så pillars kan eksekveres:

| Item | Effort | Blokerer |
|---|---|---|
| Resend email — wire `sendCoachReviewEmail` mønster til adaptation-digest + co-coach assignment + co-coach quality-demotion | ~½ dag | Søjle 1 ops + Søjle 4 safety |
| HRV V2.5 worktree merge | <1t | Trunk hygiene |
| Slet gammel stash "pre-trunk-pull untracked backup" | 1min | Bare gøres |

---

## Hvad vi *fortsætter* med — alt der ligger inden for pillars

Disse fortsætter som hidtil, men forstærkes af de fire søjler:

| Område | Status | Hvordan det relaterer til pillars |
|---|---|---|
| **HRV stack** | Mature (V2.1–V2.5 shippet) | Input til Søjle 1 (Adaptive Engine) |
| **Reps + tier-events** | Mature, balance-baseret promotion via trigger | Bærer Søjle 4's coaching-progression uden orchestration |
| **Form-check pipeline** | Mature (Claude vision + coach queue) | Template for co-coach review-pipeline i Søjle 4 |
| **Coach `/queue`** | Mature | Munk's primære review-surface; udvides med adaptation-køen |
| **Program generator** | Mature (rule + Claude cached) | Input til Søjle 1; engine'en muterer outputtet |
| **Onboarding** | Mature | Tilføj kun consent-flow til Adaptive Engine + Buddy ved tier-transitioner |
| **Stripe billing** | Plumbed, afventer pricing | Lukkes via [`PRICING_DECISION_2026-05.md`](./PRICING_DECISION_2026-05.md) |
| **Community feed** | Stable | Buddy-interaktioner lever der; ingen rebuild |
| **Messaging** | Stable (DM, signed media) | Genbruges til buddy-tråde via `thread_type` udvidelse |

---

## Den enkle test før enhver ny opgave

> *Bidrager dette direkte til Adaptive Engine, Open Brain UI, Munk Multiplier eller Crew Coaching Pyramid?*

- **Ja** → planlæg, plan-phase, eksekver
- **Nej** → tilføj til `docs/v2_backlog.md` (opret når første v2-impuls kommer) og gå videre
