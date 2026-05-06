import { createClient } from "@/lib/supabase/server";

/**
 * Idempotent: creates a starter session for a brand-new member so the
 * Today screen has something to show in connected mode. Mirrors the
 * mock TODAY_SESSION used in demo mode.
 *
 * Runs on the dashboard load; bails early if any session already exists
 * for this member.
 */
export async function ensureMemberStarter(memberId: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const { count } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId);

  if ((count ?? 0) > 0) return; // already initialised

  // Resolve PR-Block program id
  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("code", "STR-12")
    .maybeSingle();

  if (!program) return;

  // Active program assignment
  await supabase.from("program_assignments").upsert(
    {
      member_id: memberId,
      program_id: program.id,
      current_week: 4,
      status: "active",
    },
    { onConflict: "member_id" }
  );

  // Today's session
  const today = new Date().toISOString().slice(0, 10);
  const { data: session } = await supabase
    .from("sessions")
    .insert({
      member_id: memberId,
      program_id: program.id,
      week: 4,
      day_label: "Dag A — Squat",
      title: "Squat — Top set @ RPE 8, 3×3 backoff",
      estimated_minutes: 65,
      status: "scheduled",
      scheduled_for: today,
    })
    .select("id")
    .single();

  if (!session) return;

  const exercises = [
    {
      name: "Back Squat",
      cue: "Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet.",
      sets: [
        { reps: 5, weight: 80,    rpe: null, rest: 120 },
        { reps: 3, weight: 110,   rpe: null, rest: 180 },
        { reps: 3, weight: 130,   rpe: null, rest: 180 },
        { reps: 3, weight: 150,   rpe: 8,    rest: 240 },
        { reps: 3, weight: 137.5, rpe: null, rest: 180 },
        { reps: 3, weight: 137.5, rpe: null, rest: 180 },
        { reps: 3, weight: 137.5, rpe: null, rest: 0   },
      ],
    },
    {
      name: "Romanian Deadlift",
      cue: "Hofte tilbage, knæ let bøjede, baglår på spænd hele vejen.",
      sets: [
        { reps: 8, weight: 100, rpe: null, rest: 90 },
        { reps: 8, weight: 100, rpe: null, rest: 90 },
        { reps: 8, weight: 100, rpe: null, rest: 0  },
      ],
    },
    {
      name: "Walking Lunge",
      cue: "Lange skridt, lodret torso, push fra hælen på forreste fod.",
      sets: [
        { reps: 10, weight: 20, rpe: null, rest: 60 },
        { reps: 10, weight: 20, rpe: null, rest: 60 },
        { reps: 10, weight: 20, rpe: null, rest: 0  },
      ],
    },
    {
      name: "Hanging Knee Raise",
      cue: "Kontrolleret tempo, brug ikke momentum.",
      sets: [
        { reps: 12, weight: 0, rpe: null, rest: 45 },
        { reps: 12, weight: 0, rpe: null, rest: 45 },
        { reps: 12, weight: 0, rpe: null, rest: 0  },
      ],
    },
  ];

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const { data: se } = await supabase
      .from("session_exercises")
      .insert({
        session_id: session.id,
        exercise_name: ex.name,
        cue: ex.cue,
        position: i + 1,
      })
      .select("id")
      .single();

    if (!se) continue;

    await supabase.from("session_sets").insert(
      ex.sets.map((s, j) => ({
        session_exercise_id: se.id,
        position: j + 1,
        target_reps: s.reps,
        target_weight: s.weight,
        target_rpe: s.rpe,
        rest_sec: s.rest,
      }))
    );
  }

  // Up next: schedule 3 placeholder upcoming sessions
  const upcoming = [
    { offset: 1, day: "Dag B — Bench", title: "Pause-bench, ringe-row, push-press", minutes: 55 },
    { offset: 2, day: "Dag C — Pull",  title: "Deadlift — opbygning til 90% af 1RM", minutes: 70 },
    { offset: 3, day: "Dag D — Hyper", title: "Hypertrofi: kvadriceps + skulder",     minutes: 45 },
  ];

  await supabase.from("sessions").insert(
    upcoming.map((u) => {
      const d = new Date();
      d.setDate(d.getDate() + u.offset);
      return {
        member_id: memberId,
        program_id: program.id,
        week: 4,
        day_label: u.day,
        title: u.title,
        estimated_minutes: u.minutes,
        status: "scheduled" as const,
        scheduled_for: d.toISOString().slice(0, 10),
      };
    })
  );
}
