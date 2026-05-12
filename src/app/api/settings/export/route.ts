import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { COMPANY } from "@/lib/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GDPR Art. 20 — data portability. Returns a single JSON file with
 * everything the authenticated member has on the platform. RLS scopes
 * the SELECTs to own data, so the response naturally only contains
 * the caller's records.
 */
export async function GET() {
  if (!SUPABASE_ENABLED) {
    return NextResponse.json(
      { error: "Data export only available in connected mode." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Auth" }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth" }, { status: 401 });

  const [
    member,
    sessions,
    posts,
    comments,
    reactions,
    repsTx,
    redemptions,
    formChecks,
    programAssignments,
    tierEvents,
    challengeParticipations,
  ] = await Promise.all([
    supabase.from("members").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("sessions")
      .select(`
        *,
        exercises:session_exercises(
          *,
          sets:session_sets(*)
        )
      `)
      .eq("member_id", user.id),
    supabase.from("posts").select("*").eq("member_id", user.id),
    supabase.from("post_comments").select("*").eq("member_id", user.id),
    supabase.from("post_reactions").select("*").eq("member_id", user.id),
    supabase.from("reps_transactions").select("*").eq("member_id", user.id),
    supabase.from("reward_redemptions").select("*").eq("member_id", user.id),
    supabase.from("form_checks").select("*").eq("member_id", user.id),
    supabase.from("program_assignments").select("*").eq("member_id", user.id),
    supabase.from("tier_events").select("*").eq("member_id", user.id),
    supabase.from("challenge_participants").select("*").eq("member_id", user.id),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    note:
      `Personlig dataeksport fra ${COMPANY.product}. Indeholder alt vi gemmer der er dit. Kontakt ${COMPANY.emails.support} hvis noget mangler eller ser forkert ud.`,
    member: member.data ?? null,
    program_assignments: programAssignments.data ?? [],
    sessions: sessions.data ?? [],
    posts: posts.data ?? [],
    post_comments: comments.data ?? [],
    post_reactions: reactions.data ?? [],
    reps_transactions: repsTx.data ?? [],
    reward_redemptions: redemptions.data ?? [],
    form_checks: formChecks.data ?? [],
    tier_events: tierEvents.data ?? [],
    challenge_participations: challengeParticipations.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="makeit-hq-export-${user.id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
