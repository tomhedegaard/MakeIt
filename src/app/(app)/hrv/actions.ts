"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { filterEctopic, computeRmssd, computeLnRmssd, computeMeanHr } from "@/lib/hrv/rmssd";
import { computeBaseline } from "@/lib/hrv/baseline";
import { mockInsertReading, mockListReadings } from "@/lib/hrv/mock";
import type { HrvReading, HrvSource } from "@/lib/hrv/types";

const SubmitSchema = z.object({
  rrIntervals: z.array(z.number().positive()).min(2),
  source: z.enum(["camera_ppg", "polar_h10"]),
  snrDb: z.number(),
  timezone: z.string(),
});

export type SubmitHrvResult =
  | { ok: true; reading: HrvReading }
  | { ok: false; error: string };

export async function submitHrvReading(
  input: z.infer<typeof SubmitSchema>,
): Promise<SubmitHrvResult> {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const { rrIntervals, source, snrDb, timezone } = parsed.data;

  // --- algorithm core ---
  const { clean, ectopicPct } = filterEctopic(rrIntervals);
  if (ectopicPct > 5) return { ok: false, error: "too_many_ectopic" };
  if (clean.length < 2) return { ok: false, error: "signal_too_short" };

  const rmssdMs = computeRmssd(clean);
  const lnRmssd = computeLnRmssd(rmssdMs);
  const meanHrBpm = computeMeanHr(clean);
  const confidence = source === "polar_h10" ? "high" : snrDb >= 6 ? "high" : "medium";
  const measuredAt = new Date().toISOString();

  // --- demo mode ---
  if (!SUPABASE_ENABLED) {
    const prior = mockListReadings("demo-member").map((r) => r.lnRmssd);
    const base = computeBaseline([...prior, lnRmssd]);
    const reading: HrvReading = {
      id: crypto.randomUUID(),
      memberId: "demo-member",
      measuredAt,
      source,
      confidence,
      rmssdMs,
      lnRmssd,
      meanHrBpm,
      rolling7dMeanLnRmssd: base.rolling7dMean,
      baseline60dMeanLnRmssd: base.baseline60dMean,
      baseline60dSwc: base.swc,
      warmUpState: base.warmUpState,
      readinessBucket: base.readinessBucket,
      timezone,
      isSick: false,
    };
    mockInsertReading(reading);
    revalidatePath("/hrv");
    return { ok: true, reading };
  }

  // --- connected mode ---
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_session" };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "no_session" };
  const memberId = auth.user.id;

  const { data: priorRows } = await supabase
    .from("hrv_readings")
    .select("ln_rmssd")
    .eq("member_id", memberId)
    .eq("is_sick", false)
    .order("measured_at", { ascending: true });

  const prior = (priorRows ?? []).map((r) => r.ln_rmssd as number);
  const base = computeBaseline([...prior, lnRmssd]);

  const { data: inserted, error } = await supabase
    .from("hrv_readings")
    .insert({
      member_id: memberId,
      measured_at: measuredAt,
      source,
      confidence,
      quality_warnings: { ectopic_pct: ectopicPct, snr_db: snrDb },
      rr_intervals: clean,
      rmssd_ms: rmssdMs,
      ln_rmssd: lnRmssd,
      mean_hr_bpm: meanHrBpm,
      rolling_7d_mean_lnrmssd: base.rolling7dMean,
      baseline_60d_mean_lnrmssd: base.baseline60dMean,
      baseline_60d_swc: base.swc,
      warm_up_state: base.warmUpState,
      readiness_bucket: base.readinessBucket,
      timezone,
      is_sick: false,
    })
    .select()
    .single();

  if (error || !inserted) return { ok: false, error: "insert_failed" };

  revalidatePath("/hrv");
  revalidatePath("/dashboard");
  return { ok: true, reading: mapRow(inserted) };
}

/** Maps a DB row to the HrvReading domain type. */
function mapRow(row: Record<string, unknown>): HrvReading {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    measuredAt: row.measured_at as string,
    source: row.source as HrvSource,
    confidence: row.confidence as HrvReading["confidence"],
    rmssdMs: row.rmssd_ms as number,
    lnRmssd: row.ln_rmssd as number,
    meanHrBpm: (row.mean_hr_bpm as number) ?? null,
    rolling7dMeanLnRmssd: (row.rolling_7d_mean_lnrmssd as number) ?? null,
    baseline60dMeanLnRmssd: (row.baseline_60d_mean_lnrmssd as number) ?? null,
    baseline60dSwc: (row.baseline_60d_swc as number) ?? null,
    warmUpState: row.warm_up_state as HrvReading["warmUpState"],
    readinessBucket: (row.readiness_bucket as HrvReading["readinessBucket"]) ?? null,
    timezone: row.timezone as string,
    isSick: row.is_sick as boolean,
  };
}
