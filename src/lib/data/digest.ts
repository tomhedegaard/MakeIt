/**
 * Weekly digest — aggregate stats for the past 7 days, used by the
 * "Send weekly digest" coach action and the email template.
 */
import { createClient } from "@/lib/supabase/server";

export type WeekDigest = {
  rangeFrom: string;       // ISO date
  rangeTo: string;         // ISO date
  totalPosts: number;
  totalPRs: number;
  totalSessionsCompleted: number;
  totalFormChecksReviewed: number;
  newMembers: number;
  topPosts: { who: string; content: string; reactions: number }[];
  topPosters: { who: string; count: number }[];
};

const MOCK_DIGEST: WeekDigest = {
  rangeFrom: new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10),
  rangeTo: new Date().toISOString().slice(0, 10),
  totalPosts: 47,
  totalPRs: 12,
  totalSessionsCompleted: 184,
  totalFormChecksReviewed: 9,
  newMembers: 6,
  topPosts: [
    { who: "@nina_dl", content: "Ny DL PR — 175 kg @ 68 kg BW.", reactions: 84 },
    { who: "@kasper_s", content: "Squat top single 162.5 kg, sad let.", reactions: 41 },
    { who: "@maria.lift", content: "Bench-pause med 90 kg — form-check sent ind.", reactions: 28 },
  ],
  topPosters: [
    { who: "@maria.lift", count: 6 },
    { who: "@kasper_s", count: 5 },
    { who: "@nina_dl", count: 4 },
  ],
};

export async function getWeekDigest(): Promise<WeekDigest> {
  const supabase = await createClient();
  if (!supabase) return MOCK_DIGEST;

  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const sinceDate = since.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [postsRes, prRes, sessionsRes, formChecksRes, membersRes, topPostsRes] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", since).eq("is_pr", true),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", since),
    supabase.from("form_checks").select("id", { count: "exact", head: true }).gte("coach_reviewed_at", since),
    supabase.from("members").select("id", { count: "exact", head: true }).gte("joined_at", since),
    supabase
      .from("posts")
      .select(`
        id, content,
        member:members(handle),
        reactions:post_reactions(post_id)
      `)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Top 3 posts by reactions count
  const ranked = (topPostsRes.data ?? [])
    .map((p) => {
      const m = Array.isArray(p.member) ? p.member[0] : p.member;
      return {
        who: m ? `@${m.handle}` : "@member",
        content: (p.content as string).slice(0, 140),
        reactions: (p.reactions as { post_id: string }[] | null)?.length ?? 0,
      };
    })
    .sort((a, b) => b.reactions - a.reactions)
    .slice(0, 3);

  // Top posters by post count
  const counts = new Map<string, number>();
  for (const p of topPostsRes.data ?? []) {
    const m = Array.isArray(p.member) ? p.member[0] : p.member;
    if (!m?.handle) continue;
    counts.set(m.handle, (counts.get(m.handle) ?? 0) + 1);
  }
  const topPosters = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([handle, count]) => ({ who: `@${handle}`, count }));

  return {
    rangeFrom: sinceDate,
    rangeTo: today,
    totalPosts: postsRes.count ?? 0,
    totalPRs: prRes.count ?? 0,
    totalSessionsCompleted: sessionsRes.count ?? 0,
    totalFormChecksReviewed: formChecksRes.count ?? 0,
    newMembers: membersRes.count ?? 0,
    topPosts: ranked,
    topPosters,
  };
}
