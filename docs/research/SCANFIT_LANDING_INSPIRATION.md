# Scanfit landing-teardown → MakeIt landingsside

**Dato:** 2026-08-10 · **Status:** Implementeret (se §3)
**Companion til:** `SCANFIT_PARTNERSHIP_EXPLORATION.md`

> Kildebegrænsning: scanfit.dk var egress-blokeret fra research-miljøet,
> så teardownet er rekonstrueret fra søgeindekserede sidetitler,
> produktsider, Trustpilot og danske test-sites — solidt på playbook-
> niveau, ikke pixel-niveau.

---

## 1. Scanfits konverterings-playbook

Klassisk dansk DTC, kørt disciplineret:

1. **Tilbuddet i første linje.** Sidetitel: *"Scanfit — Mere end en
   Kropsscanner — 100 dages prøve — Gratis fragt"*.
2. **Risk-reversal som stak:** 100 dages tilfredshedsgaranti, gratis
   fragt, 2 års garanti, betalt returfragt — framet "100% risikofrit".
3. **Tredjeparts-bevis først:** Trustpilot 4,7/5 (~700 anmeldelser),
   "Bedst i test"-badges (Forbrugsprisen, Sports-freak, Tech Vejlederen).
4. **Kvantificerede claims med referencepunkt:** "98,5-100% præcision —
   sammenlignelig med InBody 270".
5. **Named bundle:** "Den komplette sundhedsrejse" — økosystemet solgt
   som én rejse med ét navn.
6. **Friktionsfjernere gentaget:** "Gratis app, intet abonnement".
7. **Dansk klarsprog/SEO:** produkterne hedder "Kropsscanner" og
   "Madscanner"; de ejer de danske søgeord og vinder test-listerne.

## 2. Gap-analyse mod vores landingsside (før)

| # | Fund | Alvor |
|---|---|---|
| 1 | **Ingen venteliste/email-capture.** Eneste CTA var `/login` (kræver invite-kode) — besøgende uden kode havde ingen mulig handling | Høj |
| 2 | Risk-reversal begravet: "ingen binding" i FAQ, prislås som mikronote, 100 dages retur kun om straps i Origin | Medium |
| 3 | Hero-stats var skala-tal (straps, medlemmer), ikke resultat-tal | Medium |
| 4 | Value prop + prisanker lå som sektion 9 af 12; hero-subline var vibe, ikke konkret | Medium |
| 5 | Medlemskabets indhold spredt over 6 pillar-sektioner — intet samlende "én pakke"-greb | Lav |

SEO-parallellen er bevidst ikke adresseret: landingssiden kører
`robots: noindex` under closed beta. Genbesøg ved public launch.

## 3. Implementeret (denne branch)

1. **Venteliste** — `WaitlistSection` (sektion `#waitlist` før FAQ) +
   "Ingen invite-kode? Skriv dig på ventelisten"-link i hero.
   Server action (`src/app/waitlist-actions.ts`): zod-valideret email,
   honeypot, demo-mode no-op, service-role write (ingen anon
   RLS-policy). Migration `0056_waitlist.sql`; unik pr. email uden at
   lække medlemskab af listen; kun coach kan læse. Framet som "køen
   til næste holds invites" så closed beta-eksklusiviteten forstærkes.
2. **Trust-linje i hero** under CTA'erne: "Ingen binding · Opsig når
   som helst · Pris låst for beta-medlemmer" — alt sammen udsagn der
   allerede stod i FAQ/priskort, nu synlige above the fold.
3. **Outcome-stat i hero:** "Coaching-programmer 07" udskiftet med
   "Form-check svar: 6 SEK · AI-draft · Munk-review 24t" (tal fra
   eksisterende app-copy — intet opfundet).
4. **Value/pris rykket op** til lige efter engine-playground (sektion 5
   → 4), og hero-subline gjort konkret ("1:1-coaching, AI-tilpassede
   programmer … brøkdel af markedsprisen").
5. **"Hele systemet. Ét medlemskab."** — 5-punkts liste i priskortet
   der samler pakken (program, form-check, HRV, crew/Reps, mind).

## 4. Bevidst IKKE implementeret (beslutninger til ejerne)

- **Medlemsgaranti ("30 dage, fuld refusion")** — forretningsbeslutning,
  ikke kode. StrapIt giver 100 dages retur på fysiske varer, så DNA'et
  findes; tages sammen med prissætningen inden launch.
- **Eksterne test-badges/presse** — kræver at omtalen findes først.
  Begynd at samle den nu (Scanfit lever af den).
- **Dansk SEO-arbejde** — meningsløst under `noindex`; genbesøg ved launch.
