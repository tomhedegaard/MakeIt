# Pricing decision — Crew + 1:1 (lock før M1)

**Dato:** 2026-05-25 · **Status:** Beslutning udestår (Munk)
**Blokerer:** M1 starthandling #1 i 6-mdr wauw-planen — Stripe products live i live mode

---

## Hvorfor det skal lukkes nu

Placeholders i `src/lib/pricing.ts` (`[XX]`, `[YY]`, `[ZZ]`) gør at:
- Vi kan ikke køre realistiske demo-flows (potential members ser "[XX] kr/md")
- Vi kan ikke beregne LTV / unit economics for de telemetri-mål planen sigter mod (50 betalende ved M6)
- Stripe checkout-buttons viser kun banners — vi kan ikke lukke en eneste betaling i demo-perioden

---

## Sammenhæng med wauw-tesen

Pricing er *ikke* en frikobling fra produktet — det er en del af positioneringen. CEO-wauw-testen kræver at vi kan svare "hvad koster det?" uden at undskylde os. Tre prisarketyper at vælge imellem:

### Arketype A: Premium positioning (anbefales)

| Tier | Pris | Hvad det signalerer |
|---|---|---|
| **Crew membership** | **399 kr/md** eller **3.990 kr/år** (16% rabat) | "Det her er for atleter der allerede ejer en wearable og vil have det rigtige" |
| **1:1 Munk add-on** | **+1.499 kr/md** (8 spots, ventliste når fyldt) | "Du betaler for adgang til Mikael, ikke for app-features" |

**Begrundelse:**
- Trainerize: $20-25 USD/mo (~150 kr) → vi er klart positioneret "et niveau over" som premium
- Future: $200 USD/mo (~1.400 kr) → vi sidder under deres 1:1, men højere end deres gruppe
- WHOOP membership: 240 kr/md → vores Crew er ~1.6× men inkluderer coaching + community
- Loaded position: "Du har allerede investeret 2-3.000 kr i en wearable — Crew koster 400 om måneden ekstra for at få den rigtige værdi ud af den"

### Arketype B: Adgang-først positioning

| Tier | Pris |
|---|---|
| Crew membership | 199 kr/md / 1.990 kr/år |
| 1:1 Munk add-on | +999 kr/md |

Lavere friktion, hurtigere op til 50 medlemmer, men dilluterer brand-signalet ("hvis det er 200 kr, hvor seriøst kan det være?"). **Modarbejder wauw-tesen.**

### Arketype C: Founders / charter pricing

| Tier | Pris |
|---|---|
| Crew founders (første 50, lifetime låst) | 299 kr/md |
| Crew standard (efter 50) | 399 kr/md |
| 1:1 Munk add-on | +1.499 kr/md |

**Vinklen:** giver Munk en historie at fortælle ("Du var med fra dag ét → din pris stiger aldrig"), skaber FOMO, og lægger ankerpris ved 399 fra dag ét. **Stærkeste kombination.**

---

## Anbefaling

**Arketype C** med Arketype A's ankerpriser:

- **Crew Founders**: 299 kr/md (kun første 50, lifetime-låst pris, fortsætter ved fornyelse)
- **Crew Standard**: 399 kr/md (medlem 51+)
- **Årligt Crew**: 16% rabat på begge (2.990 / 3.990 kr/år)
- **1:1 Munk add-on**: 1.499 kr/md, 8 spots, ventliste når fyldt
- **Reps shop**: forbliver loyalty-currency (ikke revenue), uændret

**Argumenter:**
1. 399 kr er den pris CEO'en ser når han læser om os — det placerer os som premium
2. 299 founders giver fortælling + accelerator til de første 50 (M6-mål)
3. 1.499 for 1:1 er under Future's 1.400 (~$200 USD) i absolut tal, men inkluderer HRV-coaching de ikke leverer
4. Lifetime-låst founders-pris er små penge tabt (50 × 100 kr/md × 24 mdr = 120.000 kr over 2 år) for stor brand-fordel
5. Årligt giver cashflow + lavere churn

---

## Hvad Munk skal beslutte

1. **Arketype**: A, B eller C? (Anbefaling: C)
2. **Faktiske tal**: hvis ikke 299/399/1.499 — så hvilke?
3. **Skal Founders-pris låses lifetime, eller kun de første 12 mdr?**
4. **Skal 1:1 add-on kunne købes uden Crew-membership?** (Anbefaling: nej — bevar sammenhæng)
5. **Refund policy?** (Anbefaling: 14 dages fortrydelsesret jf. dansk forbrugerlov; ingen pro-rata refund derefter)

---

## Når besluttet — eksekvering (½ dag)

1. Opdater `src/lib/pricing.ts`:
   ```ts
   export const PRICING = {
     crewFounders: { monthly: 29900, yearly: 299000, currency: 'DKK', spotsTotal: 50 },
     crewStandard: { monthly: 39900, yearly: 399000, currency: 'DKK' },
     munk1on1Addon: { monthly: 149900, currency: 'DKK', spotsTotal: 8 },
   } as const;
   ```
2. Opret Stripe products i live mode (`stripe products create`)
3. Opret prices med korrekte intervals + currencies
4. Opdater env vars `STRIPE_PRICE_CREW_FOUNDERS_MONTHLY` etc.
5. Verificer `/api/stripe/webhook` håndterer alle nye price IDs
6. Opdater `messages/da/Marketing.json` med faktiske tal (fjern `[XX]` placeholders)
7. Commit: `feat(pricing): lock crew + 1:1 pricing for M1`
