/**
 * PPG signal processing — converts a stream of camera red-channel
 * intensity samples into R-R intervals. See spec §4.
 *
 * Filter choice: a difference-of-moving-averages bandpass is used
 * instead of a Butterworth biquad. For a 30 Hz input and the wide
 * 0.5-3 Hz passband this is numerically stable, dependency-free,
 * and accurate enough — a moving average of window W is a lowpass
 * with cutoff ~sampleRate/(2W). Bandpass = shortMA - longMA.
 */

const LOW_HZ = 0.5;
const HIGH_HZ = 3;
const REFRACTORY_MS = 300;
const THRESHOLD_FRACTION = 0.3; // peak must exceed mean + 0.3*(max-mean)
const WINDOW_SECONDS = 5;

/** Subtract a degree-2 polynomial least-squares fit (removes drift). */
export function detrend(samples: number[]): number[] {
  const n = samples.length;
  if (n < 3) return [...samples];
  // Normal equations for y = a0 + a1*x + a2*x^2.
  let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const x = i, x2 = x * x, y = samples[i];
    s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2;
    b0 += y; b1 += x * y; b2 += x2 * y;
  }
  // Solve the 3x3 system [s0 s1 s2; s1 s2 s3; s2 s3 s4] * a = [b0 b1 b2].
  const m = [
    [s0, s1, s2, b0],
    [s1, s2, s3, b1],
    [s2, s3, s4, b2],
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    if (Math.abs(m[col][col]) < 1e-12) return [...samples]; // singular
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let c = col; c < 4; c++) m[r][c] -= f * m[col][c];
    }
  }
  const a0 = m[0][3] / m[0][0];
  const a1 = m[1][3] / m[1][1];
  const a2 = m[2][3] / m[2][2];
  return samples.map((y, i) => y - (a0 + a1 * i + a2 * i * i));
}

/** Centered moving average with the given odd-ish window length. */
function movingAverage(samples: number[], window: number): number[] {
  const n = samples.length;
  const w = Math.max(1, Math.round(window));
  const half = Math.floor(w / 2);
  const out = new Array<number>(n);
  // Prefix sums for O(n).
  const prefix = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + samples[i];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    out[i] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
  }
  return out;
}

/** Difference-of-moving-averages bandpass, 0.5-3 Hz. */
export function bandpass(samples: number[], sampleRate: number): number[] {
  const shortWin = sampleRate / (2 * HIGH_HZ); // lowpass at 3 Hz
  const longWin = sampleRate / (2 * LOW_HZ); // lowpass at 0.5 Hz
  const lowpassed = movingAverage(samples, shortWin);
  const lowfreq = movingAverage(samples, longWin);
  return lowpassed.map((v, i) => v - lowfreq[i]);
}

/**
 * Adaptive-threshold peak detection. Sliding WINDOW_SECONDS window,
 * peak = local maximum exceeding mean + THRESHOLD_FRACTION*(max-mean)
 * of the window. Enforces a REFRACTORY_MS minimum gap. Returns sample
 * indices of detected peaks.
 */
export function detectPeaks(samples: number[], sampleRate: number): number[] {
  const n = samples.length;
  const win = Math.round(WINDOW_SECONDS * sampleRate);
  const refractory = Math.round((REFRACTORY_MS / 1000) * sampleRate);
  const peaks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    const lo = Math.max(0, i - Math.floor(win / 2));
    const hi = Math.min(n - 1, i + Math.floor(win / 2));
    let mean = 0, max = -Infinity;
    for (let j = lo; j <= hi; j++) {
      mean += samples[j];
      if (samples[j] > max) max = samples[j];
    }
    mean /= hi - lo + 1;
    const threshold = mean + THRESHOLD_FRACTION * (max - mean);
    const isLocalMax = samples[i] >= samples[i - 1] && samples[i] > samples[i + 1];
    if (isLocalMax && samples[i] >= threshold) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= refractory) {
        peaks.push(i);
      } else if (samples[i] > samples[peaks[peaks.length - 1]]) {
        // Within refractory: keep the taller peak.
        peaks[peaks.length - 1] = i;
      }
    }
  }
  return peaks;
}

/** Variance of a series. */
function variance(samples: number[]): number {
  if (samples.length === 0) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return (
    samples.reduce((a, b) => a + (b - mean) * (b - mean), 0) / samples.length
  );
}

/**
 * SNR in dB — ratio of in-band (0.5-3 Hz) energy to out-of-band
 * energy. In-band energy is the variance of the bandpassed signal;
 * out-of-band is the residual.
 */
export function computeSnrDb(samples: number[], sampleRate: number): number {
  const detrended = detrend(samples);
  const inBand = bandpass(detrended, sampleRate);
  const inBandPower = variance(inBand);
  const totalPower = variance(detrended);
  const outOfBandPower = Math.max(totalPower - inBandPower, 1e-9);
  return 10 * Math.log10(Math.max(inBandPower, 1e-12) / outOfBandPower);
}

/**
 * Full pipeline: detrend -> bandpass -> detectPeaks -> R-R intervals.
 * Returns R-R intervals in ms plus the SNR of the input.
 */
export function ppgToRrIntervals(
  samples: number[],
  sampleRate: number,
): { rrIntervals: number[]; snrDb: number } {
  const snrDb = computeSnrDb(samples, sampleRate);
  const detrended = detrend(samples);
  const filtered = bandpass(detrended, sampleRate);
  const peaks = detectPeaks(filtered, sampleRate);
  const rrIntervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    rrIntervals.push(((peaks[i] - peaks[i - 1]) / sampleRate) * 1000);
  }
  return { rrIntervals, snrDb };
}
