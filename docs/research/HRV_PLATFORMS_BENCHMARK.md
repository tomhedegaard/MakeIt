# HRV Platform Benchmark

Competitive landscape for the MakeIt HRV module. Compiled from live web research (May 2026). Companion to `HRV_SCIENCE_BRIEF.md`.

---

## Executive summary

- **Three product archetypes** dominate the HRV-training space, and they don't actually compete head-to-head:
  1. **Coaching platforms that consume HRV** (Ruut, Morpheus) — own the training plan, ingest HRV as one input among many. Recovery-first framing.
  2. **HRV measurement specialists** (HRV4Training, Elite HRV) — own the morning-measurement ritual and the science. Plan is secondary.
  3. **Wearable + recovery score** (WHOOP, Oura, Athlytic, Garmin, Polar Vantage) — own the device + 24/7 data. Recommendations are generic.
- **No serious player owns the strength-training + HRV intersection.** Endurance is well-served (Morpheus, HRV4Training, TrainingPeaks integrations). Strength is white space. This is MakeIt's opening.
- **Measurement methodology is the hidden battlefield.** Apple Watch reports **SDNN**, everyone else reports **RMSSD**. Oura measures during sleep (5-min nightly samples). WHOOP measures during deepest sleep. HRV4Training/Morpheus measure morning-supine via PPG/chest strap. **These are not comparable on the same scale.** Any aggregator has to normalize per-source and cannot pool raw values.
- **Pricing converges around $99–240/year** for the dedicated HRV/recovery products. WHOOP is the outlier at the high end ($199–359/yr with hardware). Ruut's pricing is not publicly disclosed (gated behind quiz).
- **The "10-min daily protocols" framing (Ruut) is the most aspirational positioning** — actionable, light commitment, recovery-centric. It's also the closest match to MakeIt's existing "crew lifestyle" tone.

---

## 1. Ruut Labs — primary reference

**URL:** https://ruutlabs.com · https://learn.ruutlabs.com · iOS: *Ruut: Personal Coach* (App Store ID 6755474436)

### What it is

A personalized training and recovery coaching app. User takes a quiz, gets a daily plan built around their stated goal (running, HRV, VO2 max). The plan includes workouts AND 10-minute daily recovery protocols. Recovery is positioned as equal to training, not a sidebar.

### Methodology (what's disclosed)

- **Phased periodization** — base / build / peak, "the same approach used by professional coaches."
- **Recovery-first framing**: "we don't tell you just to 'sleep more', but focus on fixing what's blocking your recovery in the first place." Plan personalizes around "body battery score, sleep debt, HRV, and recovery triggers."
- **Daily protocols ~10 minutes** — breathing, mobility, education snippets, light cardio depending on the day's signal.
- **Live in-session feedback** — breathing and pace cues during workouts.
- **No technical disclosure** about HRV measurement device, scoring formula, or training-modulation algorithm. Marketing language is consumer-facing, not scientific.

### Target user

Broad. Testimonials span complete beginners → experienced athletes, nurses, yoga practitioners, age 79+. Common thread is **health-conscious adults seeking structure with educational depth** ("I like seeing a detailed training plan along with the science so I can be intentional about my applied effort").

### Pricing

**Not disclosed publicly.** Gated behind the onboarding quiz. Reviews on Trustpilot suggest subscription with variable durations (monthly, multi-month). No free tier surfaced.

### Unique angle

The combination of **personalization + science framing + simplicity** in a single mobile app. The "Train smarter. Recover better." positioning is the closest competitor framing to what MakeIt could do. Ruut wins on simplicity and accessibility; it loses on no coach, no community, no equipment-aware programming for strength.

### Weaknesses (MakeIt's opening)

- No human coach involved (MakeIt has Munk).
- No community / crew dynamic (MakeIt has the closed beta tribe).
- Generic running/cardio focus — **strength is not a Ruut program**.
- No persistent membership rewards loop (MakeIt has Reps).
- No body-anatomy / exercise-library depth (MakeIt's `/train` is heavier here).
- HRV methodology is opaque — they don't tell you *how* they decide what to recommend.

---

## 2. HRV4Training — measurement specialist

**Founder:** Marco Altini (PhD, sport science / signal processing). The most credible solo voice in the consumer HRV space.

### Methodology

- **Morning supine measurement, immediately upon waking.** 1-minute reading via smartphone PPG (camera + flash on fingertip) or paired Polar H10 / Movesense / Apple Watch.
- **Metric:** raw R-R intervals → RMSSD → lnRMSSD (×20 for display).
- **Orthostatic test** (supine then standing) supported for advanced users.
- **Validation:** independently published — Altini's PPG implementation outperformed Firstbeat's ECG system in head-to-head comparison (Plews et al., 2017; Altini & Plews, 2021). The only camera-based HRV app with peer-reviewed validation.
- **Training advice engine** ("HRV4Training Pro"): combines 60-day baseline + 7-day mean + SWC band + subjective wellness inputs → daily recommendation (push hard / maintain / easy / rest).

### Pricing

iOS one-time purchase tier (~$10) + HRV4Training Pro web subscription (~$60/yr). Cheapest serious option in the space.

### Strengths

- Scientifically rigorous, the methodology Plews & Buchheit endorse.
- Camera-based — no hardware required.
- Excellent for serious self-coached endurance athletes.

### Weaknesses

- UI is utilitarian-to-ugly.
- No coaching, no community, no training plans.
- Steep learning curve — readers churn before understanding lnRMSSD trends.
- No strength-training integration.

---

## 3. Morpheus — strength-coach-adjacent

**Founder:** Joel Jamieson, conditioning coach to UFC champions, pro teams, Olympians. The "MMA/combat sports HRV" brand.

### Methodology

- **Morning chest-strap measurement (M7 strap)**, ~3 minutes daily.
- **Metric:** RMSSD normalized to **a 100-point recovery score** ("Morpheus Score") via personal baseline learning.
- **Holistic recovery model:** combines HRV + RHR + subjective wellness + sleep + activity + mental stress into the daily score.
- **Dynamic heart-rate zones** — the unique differentiator. The Blue/Green/Red zones auto-adjust each day based on recovery status. Blue zone (low intensity, aerobic, "speed up recovery") is targeted at 75-85% of monthly training time. Strong endurance-development philosophy.
- **Recommends session intensity** based on recovery score, not session selection.

### Pricing

Hardware: M7 chest strap ~$199. App subscription tier available, free basic tier with hardware purchase.

### Strengths

- Closest existing product to a "strength + conditioning + HRV" hybrid. Jamieson's background is fight sports — strength + endurance hybrid.
- Hardware-grade accuracy.
- Clear, simple daily score that coaches can act on.

### Weaknesses

- US-centric, less brand presence in Europe.
- Heart-rate-zone framing assumes the user does cardio training. Pure strength users get less from it.
- App UX dated, no community layer.
- No deep strength-program integration — adjusts intensity, not load/volume on lifts.

---

## 4. WHOOP — 24/7 strap incumbent

### Methodology

- **24/7 wrist/upper-arm strap**, PPG.
- **HRV measured during deepest sleep block** (typically slow-wave sleep), averaged across that window. Reported in milliseconds RMSSD.
- **Recovery score 0–100% (Red/Yellow/Green)** combining HRV + RHR + sleep duration/quality + respiratory rate + skin temp + SpO2.
- **ML-based personal baselining** — the score is calibrated to the individual's own historical distribution.
- **Strain score** (0–21 scale) — cardiovascular load throughout the day. Recovery + Strain together = the WHOOP framework.

### Pricing (2026)

Subscription includes hardware. Three tiers:
- **One** — $199/yr ($25/mo): basic recovery + strain
- **Peak** — $239/yr ($30/mo): adds healthspan metrics
- **Life** — $359/yr ($40/mo): medical-grade hardware (WHOOP MG), clinical biometrics, blood-pressure tracking

### Strengths

- Hardware → subscription bundle simplifies the user choice.
- The Recovery score is the most widely-adopted "single number" in the consumer HRV space.
- Massive dataset → solid personal baselining.
- API access for developers (`developer.whoop.com`).

### Weaknesses

- Requires the strap (~$300+/yr lifecycle cost vs. a free smartphone-only competitor).
- Score is a black box — combines HRV with other signals, user can't isolate HRV trend.
- Generic recommendations ("rest" or "push") — no exercise prescription detail.
- No coaching layer, no community for strength athletes specifically.

---

## 5. Oura Ring — sleep-first wellness

### Methodology

- **Ring form factor**, finger PPG, comfortable for 24/7 + sleep.
- **HRV measured ONLY during sleep** — 5-minute samples throughout the night, mean of all samples reported. RMSSD.
- **Readiness Score 0–100** from seven contributors: previous night's sleep, sleep balance, activity balance, RHR, HRV balance, body temperature, recovery index.
- **Validation:** 2026 independent study in *Physiological Reports* (Gen 3 vs Gen 4, 536 nights, 13 participants) — Oura was the most accurate consumer wearable tested against ECG reference for HRV and RHR.

### Pricing

Ring hardware $299–549 (Gen 4) + $5.99/mo subscription for full features.

### Strengths

- Highest-fidelity consumer wearable for nighttime HRV per 2026 validation.
- Comfortable form factor → high compliance.
- Strong brand among health-conscious women (menstrual-cycle tracking integrated).

### Weaknesses

- No training-prescription engine. Tells you "today's a hard day" or "rest" — doesn't tell you what to lift.
- Subscription tax on top of $300+ hardware.
- Ring-only (no chest-strap fidelity option).

---

## 6. Athlytic — Apple Watch native

iOS app, ~$50/yr. Reads Apple HealthKit overnight HRV. The "Apple Watch user's WHOOP." No hardware sale, much cheaper. Same single-recovery-score paradigm. Decent execution; no coaching. **Notable:** has to deal with Apple's SDNN-not-RMSSD limitation.

---

## 7. Elite HRV — Polar H10 ecosystem

Free + premium tiers. Pairs with Polar H10 chest strap (€90) for morning measurement. Similar science to HRV4Training but less actively developed. Strong community of biohackers and Stoic-bro endurance types.

---

## 8. Welltory — camera PPG, lifestyle-correlation angle

Smartphone fingertip PPG, daily measurements + lifestyle logging. Their pitch is "see how alcohol/sleep/stress affect *your* HRV" — the personalized-correlation angle that the HRV science brief flags as Tier 1 high-value. Less rigorous than HRV4Training but better marketing for general consumers. ~$60–100/yr.

---

## 9. Polar Vantage / Nightly Recharge

Native to Polar watches (V3, Grit X, Vantage). Free with hardware. "Nightly Recharge" = ANS recovery + sleep score. Strong for endurance athletes already in the Polar ecosystem. No coaching layer, no community.

---

## 10. Garmin Body Battery + HRV Status

Native to higher-end Garmin watches. "HRV Status" rolls a 7-day baseline (introduced 2022). "Body Battery" combines HRV + stress + activity. Strong for triathlon/ultra-endurance demographic. No coaching, generic recommendations.

---

## Comparison table

| Platform | Measurement | Metric | Output | Coaching | Pricing | Strength focus |
|---|---|---|---|---|---|---|
| **Ruut Labs** | Quiz + (HRV input, source unclear) | Not disclosed | Personalized daily plan + 10-min recovery protocols | Algorithmic | Gated quiz | No (running/HRV/VO2max) |
| **HRV4Training** | Morning PPG / chest strap | lnRMSSD | Push/maintain/easy/rest | Self-coached | ~$60/yr | No |
| **Morpheus** | Morning chest strap M7 | RMSSD → 0-100 score | Recovery score + dynamic HR zones | Algorithmic | ~$199 hw + free | Partial (combat sports) |
| **WHOOP** | 24/7 strap, deep sleep | RMSSD → 0-100 score | Recovery + Strain | Generic | $199-359/yr (incl. hw) | No |
| **Oura Ring** | Ring, all-night avg | RMSSD | Readiness 0-100 | None | $299+ hw + $72/yr | No |
| **Athlytic** | Apple Watch overnight | SDNN (Apple HK) | Recovery score | None | ~$50/yr | No |
| **Elite HRV** | Polar H10 morning | lnRMSSD | Morning report | None | Free + premium | No |
| **Welltory** | Camera PPG | RMSSD + LF/HF (warning: deprecated) | Lifestyle correlations | None | ~$60-100/yr | No |
| **Polar Vantage** | Watch overnight | Native algo | Nightly Recharge | None | Free w/ watch | No |
| **Garmin** | Watch 24/7 | HRV Status 7-day baseline | Body Battery + status | None | Free w/ watch | No |
| **MakeIt HQ (proposed)** | TBD (data source decision pending) | lnRMSSD | Coach + algo + crew + adaptive program | Human + AI | Existing crew membership | **Yes — strength-first** |

---

## White space — where MakeIt wins

The competitive map collapses into two axes: **measurement rigor** (left-right) and **coaching depth** (top-bottom).

- **Top-right (rigorous + deeply coached): essentially empty.** Morpheus is the only player even close, and it's an endurance-leaning hardware product with weak strength integration and dated UX.
- **Bottom-right (rigorous + DIY): well-served** — HRV4Training, Elite HRV.
- **Top-left (light measurement + deeply coached): Ruut Labs.** This is where Ruut sits.
- **Bottom-left: WHOOP, Oura, Athlytic** — measurement + generic guidance.

**MakeIt's opening: top-right with a strength-training focus.** Specifically:

1. **Strength-specific HRV-guided programming.** No serious incumbent. The HRV-science brief flags this as Tier 3 (exploratory) — that's accurate, but it's also a positioning advantage. Frame it honestly: "we adapt your lifting plan to your recovery status; the science here is emerging, and we'll be transparent about what we're doing and why."
2. **Coach + crew + algorithm trio.** Munk reviews trends weekly. The algorithm modulates today's session. The crew sees aggregated wins (e.g., "the crew's average sleep last week → 7h12, HRV +4% from baseline") without ever exposing individual HRV (the science brief explicitly forbids ranking users).
3. **Lifestyle-correlation engine (the Welltory move, done seriously).** With alcohol logging, sleep, training type, and an LLM that can write personalized weekly observations ("Tom, on weeks you drank ≥3 nights, your lnRMSSD averaged 4.2% lower"). Differentiated from Ruut by depth.
4. **Reps integration.** The MakeIt loyalty layer means we can reward consistent morning measurement. None of the incumbents have a comparable engagement loop.
5. **Form-check + HRV combined.** "Your form looks tight, but your HRV says you're under-recovered — the failed third rep wasn't a strength issue, it was a CNS issue." Coach-quality reasoning, no incumbent does this.
6. **Honest science framing.** Refuse to display LF/HF as "stress balance." Refuse to rank users. Show trends, not single-day scores. This is a positioning bet that the MakeIt crew is sophisticated enough to value rigor over confetti.

## What we must match (table stakes)

- A clean morning measurement flow (under 90 seconds, including UI).
- A daily lnRMSSD value + 7-day mean + 60-day baseline band visualization.
- A clear daily readiness signal (3 buckets, not 100-point score).
- Multi-device support: at minimum Apple Watch (HealthKit) + Polar H10 (BLE) + smartphone camera fallback.
- An illness-early-warning notification path.
- Lifestyle logging (alcohol, sleep duration, training, subjective wellness).

## What we should explicitly NOT do

- A 100-point recovery score that hides components (WHOOP/Oura did this; users learn nothing).
- A peer leaderboard for HRV (science brief: forbidden).
- "Boost your HRV with [supplement]" content.
- Population HRV percentile rankings.
- LF/HF as "sympatho-vagal balance" UI (Billman 2013 deprecated this).
- Pretend "HRV-guided strength training" has the same evidence as endurance — it doesn't.

---

## Sources

- [Ruut Labs](https://ruutlabs.com/) · [learn.ruutlabs.com](https://learn.ruutlabs.com/) · [App Store listing](https://apps.apple.com/cy/app/ruut-personal-coach/id6755474436) · [Trustpilot reviews](https://www.trustpilot.com/review/ruutlabs.com)
- [HRV4Training (Marco Altini Substack)](https://marcoaltini.substack.com/) · [HRV4Training Pro overview](https://marcoaltini.substack.com/p/hrv4training-pro-overview-page) · [Apple Watch HRV interpretation](https://medium.com/@altini_marco/on-heart-rate-variability-and-the-apple-watch-24f50e8e7bc0)
- [Morpheus Training System](https://trainwithmorpheus.com/) · [Morpheus Heart Rate Zones](https://trainwithmorpheus.com/the-morpheus-heart-rate-zones/) · [Peter Attia × Joel Jamieson interview](https://peterattiamd.com/joeljamieson/)
- [WHOOP Recovery methodology](https://www.whoop.com/us/en/thelocker/how-does-whoop-recovery-work-101/) · [WHOOP Developer Docs](https://developer.whoop.com/docs/whoop-101/) · [WHOOP Pricing 2026](https://trackervs.com/pricing/whoop-pricing/)
- [Oura Readiness Score](https://ouraring.com/blog/readiness-score/) · [Oura HRV methodology](https://support.ouraring.com/hc/en-us/articles/360025441974-Heart-Rate-Variability) · [Oura validation paper (Sensors, 2024)](https://www.mdpi.com/1424-8220/24/23/7475)
- [Apple HealthKit HRV SDNN documentation](https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/heartratevariabilitysdnn) · [Apple Watch HRV methodology PDF](https://www.apple.com/health/pdf/Heart_Rate_Calorimetry_Activity_on_Apple_Watch_November_2024.pdf)
- [Athlytic 2026 review](https://www.corahealth.app/compare/athlytic)
- [Wearable HRV comparison — SDNN vs RMSSD](https://www.empirical.health/blog/how-wearables-measure-hrv/)
