# P0 Spike — Camera-PPG Feasibility Findings

**Date:** 2026-05-17
**Spike:** Task 0 of the HRV module Phase-1 plan
**Verdict: NO-GO for web-based camera-PPG as the primary measurement input.**

---

## What was tested

A self-contained browser PPG probe was built and deployed (`hrv-probe-deploy.vercel.app`), then iterated twice:

- **Probe v1** — 60s camera capture, red-channel PPG, the §4 algorithm (detrend → difference-of-moving-averages bandpass → adaptive-threshold peak detection), on-device GO/NO-GO verdict.
- **Probe v2** — added the strongest known accuracy fixes: sub-sample parabolic peak interpolation (removes R-R quantisation — the dominant RMSSD noise source at 30-60 fps), 60 fps capture request, 3-channel (R/G/B) capture with best-SNR channel selection, and a front-camera screen-flash mode for iOS (the screen rendered white as the light source, since iOS Safari cannot control the rear torch).

Tested on the user's own devices (iPhone Safari; MacBook used only to confirm the page loads — a laptop webcam cannot do fingertip PPG).

## Finding

**Stable, repeatable measurements could not be obtained**, even with probe v2's accuracy improvements. The user's direct report: *"det er enormt svært at få holdbare målinger"* — measurements were inconsistent between attempts.

## Root cause

Web-based camera-PPG is fundamentally handicapped versus native PPG apps:

- **iOS Safari cannot control the rear torch** from `getUserMedia` at all (a native-app-only capability). The front-camera screen-flash workaround helps but is weak.
- **iOS Safari does not expose camera exposure / ISO / white-balance / focus controls.** Auto-exposure actively fights the PPG signal — as the fingertip's blood volume pulses, the camera "corrects" the brightness change, damping the very modulation being measured. Native apps lock exposure; a web app on iOS cannot.
- **Frame timing jitter.** `requestAnimationFrame`-driven sampling is not the uniform, hardware-timed capture a native app gets.

HRV4Training — the validated gold standard for camera-PPG — works precisely because it is a **native app** with full manual camera control. A browser cannot match that, and the gap is not closable with algorithm work.

Probe v2's improvements (sub-sample interpolation, 60 fps, multi-channel) are sound and would help a native implementation; they were not enough to overcome the browser sandbox limitations on iOS.

## Decision

**Pivot to wearable-first data sourcing** (spike's "Option B"). Rationale:

- The platform positions the HRV module as *rigorous and science-first*, built around a *daily ritual*. A measurement users struggle to obtain is disqualifying for both.
- The MakeIt crew is a premium fitness audience; wearable ownership is likely high (the product owner uses a WHOOP). Forcing a fragile daily camera measurement solves a problem much of the crew does not have — the data already exists on their wrist.
- Wearable cloud APIs (WHOOP, Oura, Polar AccessLink) provide clean, device-validated HRV with none of the quantisation / exposure / torch problems.

Camera-PPG is **not abandoned** — it is demoted to a **low-confidence fallback** for members without a wearable, and a proper implementation is deferred to a potential **native-app milestone** (where full camera control makes it viable).

## Impact

**Spec** (`2026-05-15-hrv-module-design.md`) — revised to wearable-first: §2 (platform/goals), §4 (data sources), §5 (baseline — per-wearable, not standardised cross-source), §9 (schema — `hrv_readings.source` enum, `rr_intervals` nullable, sync model), §11 (phasing).

**Plan** (`2026-05-16-hrv-module-phase-1.md`) — Tasks 1-8 (Vitest, types, migration, algorithm core: rmssd / ppg / baseline / mock) **survive** — the algorithm core is source-agnostic and reusable. Task 9 (`submitHrvReading`) and Tasks 10-16 (camera capture UI) are **superseded** and replaced with wearable-integration tasks in a revised plan.

## What survives from the work already done

- `src/lib/hrv/rmssd.ts`, `baseline.ts` — fully reusable; baseline math is source-agnostic.
- `src/lib/hrv/ppg.ts` — retained for the future camera fallback / native app.
- Migration `0031` — minor revision (source enum, nullable `rr_intervals`).
- The probe (`public/hrv-ppg-probe.html`) — retained as a reference artifact and for any future native-app validation.
