#!/usr/bin/env node
/**
 * scripts/seed-adaptive-demo.mjs
 *
 * Seeds a synthetic test member for end-to-end Adaptive Program Engine
 * testing without waiting 60 days for baseline warm-up or running real
 * wearable syncs.
 *
 * Scenario: HRV low + short sleep + tired feeling → rule layer should
 * emit `top_set_reduction` (HRV low + lifestyle co-factor), confidence
 * ~0.8, no escalation. After running this script you can:
 *
 *   1. Trigger the cron locally:
 *
 *        curl http://localhost:3002/api/cron/adapt-program-daily \
 *          -H "Authorization: Bearer $CRON_SECRET"
 *
 *   2. Log in as adaptive-demo@makeit.local (password: demo-12345)
 *      and open tomorrow's session. You should see the AdaptationCard
 *      above the first exercise, top-set weight reduced 10%, "−10%"
 *      badge on the targets row.
 *
 * Idempotent — safe to re-run. Wipes the demo member's existing HRV
 * readings, lifestyle logs, programs, and sessions before re-seeding
 * so the timeline always reflects "today" relative to wall clock.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in
 * the environment (read via supabase status / .env.local).
 *
 * Usage:
 *   npm run seed:adaptive
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error(
    "ERROR: SUPABASE_SERVICE_ROLE_KEY required.\n" +
      "Run `supabase status` and export the service_role key, or source .env.local."
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// NOTE on handle: the on_auth_user_created trigger derives the handle
// from email by stripping non-[a-z0-9_]. We use an underscore so the
// trigger's derived handle matches the canonical one — no rename
// dance needed.
const DEMO_EMAIL = "adaptive_demo@makeit.local";
const DEMO_HANDLE = "adaptive_demo";
const DEMO_DISPLAY = "Adaptive Demo";
const DEMO_PASSWORD = "demo-12345";

const MS_PER_DAY = 86_400_000;
const TODAY = new Date();
TODAY.setUTCHours(7, 0, 0, 0); // pin to morning so the cron's now() is after readings

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function isoStamp(d) {
  return d.toISOString();
}

function dayOffset(days) {
  return new Date(TODAY.getTime() + days * MS_PER_DAY);
}

// ---------------------------------------------------------------- //
// Step 1: ensure auth user + members row.
// ---------------------------------------------------------------- //

async function ensureMember() {
  // Look up by email — the on_auth_user_created trigger auto-inserts a
  // members row when we create the auth user, so we never INSERT
  // members ourselves; we UPDATE to the demo display_name + tier.
  const { data: existing } = await sb
    .from("members")
    .select("id")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();
  let memberId;
  if (existing) {
    memberId = existing.id;
    console.log(`✓ member exists: ${memberId}`);
  } else {
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (createErr) throw new Error(`createUser: ${createErr.message}`);
    memberId = created.user.id;
    console.log(`✓ created auth user + member: ${memberId}`);
  }

  // Idempotently set the demo profile fields (handle is already the
  // canonical "adaptive_demo" thanks to the trigger's email split).
  const { error: updErr } = await sb
    .from("members")
    .update({
      display_name: DEMO_DISPLAY,
      tier: "Athlete",
    })
    .eq("id", memberId);
  if (updErr) throw new Error(`members update: ${updErr.message}`);

  return memberId;
}

// ---------------------------------------------------------------- //
// Step 2: hrv_settings — opt-in to adaptive engine + coach sharing.
// ---------------------------------------------------------------- //

async function seedSettings(memberId) {
  // Note: hrv_settings.preferred_source was dropped in 0037 (camera era).
  const { error } = await sb.from("hrv_settings").upsert(
    {
      member_id: memberId,
      session_suggestion_enabled: true,
      share_to_coach: true,
      adaptive_program_enabled: true,
    },
    { onConflict: "member_id" }
  );
  if (error) throw new Error(`hrv_settings: ${error.message}`);
  console.log("✓ hrv_settings (adaptive enabled)");
}

// ---------------------------------------------------------------- //
// Step 3: hrv_wearable_connections — one active Polar connection.
// ---------------------------------------------------------------- //

async function seedConnection(memberId) {
  // Wipe existing demo connections to keep one consistent active row.
  await sb.from("hrv_wearable_connections").delete().eq("member_id", memberId);
  const { data, error } = await sb
    .from("hrv_wearable_connections")
    .insert({
      member_id: memberId,
      provider: "polar",
      access_token: "demo-token-not-real-ciphertext",
      is_primary: true,
      status: "active",
      last_synced_at: isoStamp(TODAY),
    })
    .select("id")
    .single();
  if (error) throw new Error(`connection: ${error.message}`);
  console.log(`✓ connection: ${data.id}`);
  return data.id;
}

// ---------------------------------------------------------------- //
// Step 4: 60 days of hrv_readings. Stable baseline 4.5 lnRmssd with
// small daily noise; today drops to 3.85 → readiness_bucket=low,
// driving the rule layer's hrv_low signal.
// ---------------------------------------------------------------- //

async function seedReadings(memberId, connectionId) {
  await sb.from("hrv_readings").delete().eq("member_id", memberId);

  const baseline60 = 4.5; // ln(90 ms)
  const swc = 0.15; // smallest worthwhile change

  // Build readings oldest → newest. Index 0 is 59 days ago; index 59 is today.
  const readings = [];
  for (let i = 0; i < 60; i++) {
    const day = dayOffset(-(59 - i));
    // Small deterministic noise (sin-based so the script is reproducible
    // without seeding a PRNG).
    const noise = Math.sin(i * 1.3) * 0.08;
    let lnRmssd = baseline60 + noise;

    // Today (index 59) drops just enough to hit readiness_bucket='low'
    // (delta vs baseline ≈ -1.3×SWC, in the (-2×swc, -0.5×swc) range).
    // Going lower would land 'very_low' and trigger paused_session
    // instead of the top_set_reduction this demo wants to showcase.
    if (i === 59) lnRmssd = 4.3;

    const rmssd = Math.exp(lnRmssd);

    // Rolling 7-day mean over previous 7 readings (inclusive).
    const windowStart = Math.max(0, i - 6);
    const window = readings.slice(windowStart, i).concat([{ ln_rmssd: lnRmssd }]);
    const rolling7 =
      window.reduce((a, r) => a + r.ln_rmssd, 0) / window.length;

    // Readiness bucket derived from (today - baseline) vs SWC.
    let readinessBucket;
    const delta = lnRmssd - baseline60;
    if (delta > 2 * swc) readinessBucket = "very_high";
    else if (delta > 0.5 * swc) readinessBucket = "high";
    else if (delta > -0.5 * swc) readinessBucket = "normal";
    else if (delta > -2 * swc) readinessBucket = "low";
    else readinessBucket = "very_low";

    readings.push({
      member_id: memberId,
      connection_id: connectionId,
      measured_at: isoStamp(new Date(day.getTime() - 30 * 60 * 1000)), // 06:30 UTC
      source: "polar",
      confidence: "high",
      rr_intervals: null,
      rmssd_ms: rmssd.toFixed(2),
      ln_rmssd: lnRmssd.toFixed(4),
      mean_hr_bpm: 55,
      rolling_7d_mean_lnrmssd: rolling7.toFixed(4),
      baseline_60d_mean_lnrmssd: baseline60.toFixed(4),
      baseline_60d_swc: swc.toFixed(4),
      warm_up_state: "active",
      readiness_bucket: readinessBucket,
      timezone: "Europe/Copenhagen",
      is_sick: false,
      provider_recorded_at: isoStamp(day),
      resting_hr_bpm: 55,
    });
  }

  const { error } = await sb.from("hrv_readings").insert(readings);
  if (error) throw new Error(`readings: ${error.message}`);
  console.log(`✓ 60 hrv_readings (today: low bucket, lnRmssd 3.85)`);
}

// ---------------------------------------------------------------- //
// Step 5: lifestyle logs — short sleep + tired feeling so the rule
// layer adds low_sleep and low_feeling signals on top of hrv_low.
// ---------------------------------------------------------------- //

async function seedLifestyle(memberId) {
  await sb.from("hrv_lifestyle_logs").delete().eq("member_id", memberId);

  const rows = [
    {
      member_id: memberId,
      logged_for_date: isoDate(dayOffset(-1)),
      event_type: "sleep_hours",
      value: { hours: 5 },
    },
    {
      member_id: memberId,
      logged_for_date: isoDate(dayOffset(-1)),
      event_type: "feeling",
      value: { state: "tired" },
    },
    {
      member_id: memberId,
      logged_for_date: isoDate(TODAY),
      event_type: "sleep_hours",
      value: { hours: 5.5 },
    },
  ];
  const { error } = await sb.from("hrv_lifestyle_logs").insert(rows);
  if (error) throw new Error(`lifestyle: ${error.message}`);
  console.log("✓ lifestyle logs (sleep 5h, feeling tired)");
}

// ---------------------------------------------------------------- //
// Step 6: program + assignment + 3 sessions (yesterday completed,
// today scheduled, tomorrow scheduled). The engine targets the next
// scheduled session ≤2 days out — tomorrow's.
// ---------------------------------------------------------------- //

const DEMO_PROGRAM_CODE = "ADAPTIVE-DEMO-STR";

async function seedProgramAndSessions(memberId) {
  // Wipe prior demo sessions for this member (cascades to exercises + sets).
  await sb.from("sessions").delete().eq("member_id", memberId);

  // Look up existing demo program; insert if missing.
  // Always unpublished: programs.is_published defaults to true, and
  // the member library denylists ADAPTIVE-DEMO* — keep both layers.
  let { data: program } = await sb
    .from("programs")
    .select("id")
    .eq("code", DEMO_PROGRAM_CODE)
    .maybeSingle();
  if (!program) {
    const { data: created, error } = await sb
      .from("programs")
      .insert({
        code: DEMO_PROGRAM_CODE,
        name: "Adaptive Demo · Strength",
        type: "Strength",
        weeks: 12,
        level: "Intermediate",
        description: "Synthetic program used by scripts/seed-adaptive-demo.mjs.",
        is_published: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(`programs: ${error.message}`);
    program = created;
  } else {
    const { error: unpubErr } = await sb
      .from("programs")
      .update({ is_published: false })
      .eq("id", program.id);
    if (unpubErr) throw new Error(`programs unpublish: ${unpubErr.message}`);
  }

  // Active program_assignment (one per member, enforced by partial unique).
  await sb
    .from("program_assignments")
    .delete()
    .eq("member_id", memberId);
  const { error: paErr } = await sb.from("program_assignments").insert({
    member_id: memberId,
    program_id: program.id,
    status: "active",
    current_week: 3,
  });
  if (paErr) throw new Error(`program_assignment: ${paErr.message}`);

  // Three sessions: yesterday completed, today scheduled, tomorrow scheduled.
  const sessions = [
    {
      id: randomUUID(),
      member_id: memberId,
      program_id: program.id,
      week: 3,
      day_label: "Dag A — Squat",
      title: "Back squat — top set @ RPE 8",
      scheduled_for: isoDate(dayOffset(-1)),
      status: "completed",
      started_at: isoStamp(new Date(dayOffset(-1).getTime() + 16 * 3600 * 1000)),
      completed_at: isoStamp(new Date(dayOffset(-1).getTime() + 17 * 3600 * 1000)),
      estimated_minutes: 60,
    },
    {
      id: randomUUID(),
      member_id: memberId,
      program_id: program.id,
      week: 3,
      day_label: "Dag B — Hinge",
      title: "Deadlift — top set",
      scheduled_for: isoDate(TODAY),
      status: "scheduled",
      estimated_minutes: 55,
    },
    {
      id: randomUUID(),
      member_id: memberId,
      program_id: program.id,
      week: 3,
      day_label: "Dag C — Squat",
      title: "Back squat — repeat",
      scheduled_for: isoDate(dayOffset(1)),
      status: "scheduled",
      estimated_minutes: 60,
    },
  ];

  const { error: sErr } = await sb.from("sessions").insert(sessions);
  if (sErr) throw new Error(`sessions: ${sErr.message}`);

  // For each session, attach exercises + sets. Main lift varies per
  // session; accessory is the same RDL pattern.
  const exercises = [
    // Yesterday — Back squat (completed with logged RPE close to target).
    { sessionIdx: 0, name: "Back squat", position: 1, sets: [
      { reps: 3, w: 100, rpe: 8, logged: { reps: 3, w: 100, rpe: 8.5 } },
      { reps: 3, w: 87.5, rpe: null, logged: { reps: 3, w: 87.5, rpe: 7 } },
      { reps: 3, w: 87.5, rpe: null, logged: { reps: 3, w: 87.5, rpe: 7.5 } },
    ] },
    { sessionIdx: 0, name: "Romanian deadlift", position: 2, sets: [
      { reps: 8, w: 60, rpe: null, logged: { reps: 8, w: 60, rpe: 7 } },
      { reps: 8, w: 60, rpe: null, logged: { reps: 8, w: 60, rpe: 7.5 } },
    ] },

    // Today — Deadlift (scheduled, not logged).
    { sessionIdx: 1, name: "Conventional deadlift", position: 1, sets: [
      { reps: 3, w: 140, rpe: 8 },
      { reps: 3, w: 120, rpe: null },
      { reps: 3, w: 120, rpe: null },
    ] },
    { sessionIdx: 1, name: "Barbell row", position: 2, sets: [
      { reps: 10, w: 50, rpe: null },
      { reps: 10, w: 50, rpe: null },
    ] },

    // Tomorrow — Back squat (THE one the engine targets).
    { sessionIdx: 2, name: "Back squat", position: 1, sets: [
      { reps: 3, w: 100, rpe: 8 },
      { reps: 3, w: 87.5, rpe: null },
      { reps: 3, w: 87.5, rpe: null },
    ] },
    { sessionIdx: 2, name: "Walking lunge", position: 2, sets: [
      { reps: 10, w: 20, rpe: null },
      { reps: 10, w: 20, rpe: null },
    ] },
  ];

  for (const ex of exercises) {
    const { data: seRow, error: seErr } = await sb
      .from("session_exercises")
      .insert({
        session_id: sessions[ex.sessionIdx].id,
        exercise_name: ex.name,
        position: ex.position,
      })
      .select("id")
      .single();
    if (seErr) throw new Error(`session_exercises: ${seErr.message}`);

    const setRows = ex.sets.map((s, idx) => ({
      session_exercise_id: seRow.id,
      position: idx + 1,
      target_reps: s.reps,
      target_weight: s.w,
      target_rpe: s.rpe,
      rest_sec: idx === ex.sets.length - 1 ? 0 : 180,
      logged_reps: s.logged?.reps ?? null,
      logged_weight: s.logged?.w ?? null,
      logged_rpe: s.logged?.rpe ?? null,
      logged_at: s.logged ? isoStamp(new Date(dayOffset(-1).getTime() + 17 * 3600 * 1000)) : null,
    }));
    const { error: setsErr } = await sb.from("session_sets").insert(setRows);
    if (setsErr) throw new Error(`session_sets: ${setsErr.message}`);
  }

  console.log(`✓ program + 3 sessions (next = ${sessions[2].id} tomorrow)`);
  return sessions;
}

// ---------------------------------------------------------------- //
// Main
// ---------------------------------------------------------------- //

async function main() {
  console.log(`Seeding adaptive demo against ${SUPABASE_URL}\n`);

  const memberId = await ensureMember();
  await seedSettings(memberId);
  const connectionId = await seedConnection(memberId);
  await seedReadings(memberId, connectionId);
  await seedLifestyle(memberId);
  const sessions = await seedProgramAndSessions(memberId);

  console.log("\n✅ Seed complete.\n");
  console.log("Next steps:");
  console.log(`  1. Trigger the cron:`);
  console.log(`       curl ${SUPABASE_URL.replace(/:\d+$/, ":3002")}/api/cron/adapt-program-daily \\`);
  console.log(`         -H "Authorization: Bearer $CRON_SECRET"`);
  console.log(`  2. Log in as ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
  console.log(`  3. Open the tomorrow session: /session/${sessions[2].id}`);
  console.log(`     Expected: AdaptationCard above first exercise,`);
  console.log(`     top-set weight 90 kg (was 100), "−10%" badge,`);
  console.log(`     reasons: hrv_low + low_sleep + low_feeling.\n`);
}

main().catch((err) => {
  console.error(`\n❌ Seed failed: ${err.message}`);
  process.exit(1);
});
