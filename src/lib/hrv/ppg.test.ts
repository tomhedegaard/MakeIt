import { describe, it, expect } from "vitest";
import { detrend, detectPeaks, computeSnrDb, ppgToRrIntervals } from "./ppg";

/** Synthesize a clean PPG signal: sine at `hz`, `sampleRate` Hz, `seconds` long. */
function synthPpg(hz: number, sampleRate: number, seconds: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < sampleRate * seconds; i++) {
    out.push(Math.sin((2 * Math.PI * hz * i) / sampleRate));
  }
  return out;
}

describe("detrend", () => {
  it("removes a linear brightness ramp", () => {
    const ramp = Array.from({ length: 100 }, (_, i) => i * 0.5);
    const out = detrend(ramp);
    // after detrending a pure ramp, values should be near zero
    expect(Math.max(...out.map(Math.abs))).toBeLessThan(1);
  });
});

describe("detectPeaks", () => {
  it("finds one peak per cycle in a clean 1 Hz signal at 30 Hz", () => {
    const signal = synthPpg(1, 30, 10); // 10 seconds, 1 Hz -> ~10 peaks
    const peaks = detectPeaks(signal, 30);
    expect(peaks.length).toBeGreaterThanOrEqual(9);
    expect(peaks.length).toBeLessThanOrEqual(11);
  });

  it("respects the 300ms refractory period", () => {
    const signal = synthPpg(1, 30, 10);
    const peaks = detectPeaks(signal, 30);
    for (let i = 1; i < peaks.length; i++) {
      const gapMs = ((peaks[i] - peaks[i - 1]) / 30) * 1000;
      expect(gapMs).toBeGreaterThanOrEqual(300);
    }
  });
});

describe("computeSnrDb", () => {
  it("reports high SNR for a clean in-band signal", () => {
    const signal = synthPpg(1, 30, 10); // 1 Hz is in the 0.5-3 Hz band
    expect(computeSnrDb(signal, 30)).toBeGreaterThan(3);
  });
});

describe("ppgToRrIntervals", () => {
  it("derives ~1000ms R-R intervals from a clean 1 Hz signal", () => {
    const signal = synthPpg(1, 30, 30);
    const { rrIntervals } = ppgToRrIntervals(signal, 30);
    const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    expect(mean).toBeGreaterThan(900);
    expect(mean).toBeLessThan(1100);
  });
});
