/**
 * R-R interval math for HRV. All inputs are arrays of inter-beat
 * intervals in milliseconds. See spec §4 (ectopic filter) and §5
 * (RMSSD / lnRMSSD).
 */

const ECTOPIC_DEVIATION = 0.25; // 25% — spec §4
const ECTOPIC_WINDOW = 5; // moving median of previous 5 intervals

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Removes ectopic beats: any interval deviating >25% from the moving
 * median of the previous up-to-5 accepted intervals is dropped.
 */
export function filterEctopic(rr: number[]): {
  clean: number[];
  ectopicPct: number;
} {
  if (rr.length === 0) return { clean: [], ectopicPct: 0 };
  const clean: number[] = [];
  let dropped = 0;
  for (const interval of rr) {
    if (clean.length === 0) {
      clean.push(interval);
      continue;
    }
    const window = clean.slice(-ECTOPIC_WINDOW);
    const ref = median(window);
    if (Math.abs(interval - ref) / ref > ECTOPIC_DEVIATION) {
      dropped += 1;
    } else {
      clean.push(interval);
    }
  }
  return { clean, ectopicPct: (dropped / rr.length) * 100 };
}

/** RMSSD — root mean square of successive differences (ms). */
export function computeRmssd(rr: number[]): number {
  if (rr.length < 2) {
    throw new Error("computeRmssd requires at least 2 intervals");
  }
  let sumSq = 0;
  for (let i = 1; i < rr.length; i++) {
    const diff = rr[i] - rr[i - 1];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / (rr.length - 1));
}

/** Natural log of RMSSD — the value all baseline math operates on. */
export function computeLnRmssd(rmssd: number): number {
  return Math.log(rmssd);
}

/** Mean heart rate (bpm) from an R-R series. */
export function computeMeanHr(rr: number[]): number {
  if (rr.length === 0) throw new Error("computeMeanHr requires intervals");
  const meanRr = rr.reduce((a, b) => a + b, 0) / rr.length;
  return 60000 / meanRr;
}
