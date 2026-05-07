import { createClient } from "@/lib/supabase/server";

export type FeedPost = {
  id: string;
  who: string;       // "@handle"
  tier: string;
  content: string;
  tag: "PR" | "Note" | "Form-check" | null;
  isPr: boolean;
  formcheck?: boolean;
  whenLabel: string;
  reactionsCount: number;
  commentsCount: number;
  reactedByMe: boolean;
};

export type Comment = {
  id: string;
  who: string;        // "@handle"
  tier: string;
  content: string;
  whenLabel: string;
  createdAt: string;
};

type RawRow = {
  id: string;
  content: string;
  tag: string | null;
  is_pr: boolean;
  created_at: string;
  form_check_id: string | null;
  member: { handle: string; tier: string } | { handle: string; tier: string }[] | null;
  reactions: { member_id: string }[] | null;
  comments: { id: string }[] | null;
};

function humanWhen(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "lige nu";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

/**
 * Fetch the live feed for the crew. Returns null in demo mode so the
 * page can render its mock feed.
 */
export async function getFeedPosts(limit = 30): Promise<FeedPost[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user?.id;

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id, content, tag, is_pr, created_at, form_check_id,
      member:members(handle, tier),
      reactions:post_reactions(member_id),
      comments:post_comments(id)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RawRow[]>();

  if (error || !data) return [];

  return data.map((row) => {
    const m = Array.isArray(row.member) ? row.member[0] : row.member;
    const reactions = row.reactions ?? [];
    const reactedByMe = !!myId && reactions.some((r) => r.member_id === myId);
    const tag =
      row.tag === "PR" || row.tag === "Note" || row.tag === "Form-check"
        ? row.tag
        : null;
    return {
      id: row.id,
      who: m ? `@${m.handle}` : "@member",
      tier: m?.tier ?? "Lifter",
      content: row.content,
      tag,
      isPr: !!row.is_pr,
      formcheck: !!row.form_check_id || tag === "Form-check",
      whenLabel: humanWhen(row.created_at),
      reactionsCount: reactions.length,
      commentsCount: row.comments?.length ?? 0,
      reactedByMe,
    };
  });
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: "cm-1",
    who: "@kasper_s",
    tier: "Athlete",
    content: "Stærkt @nina_dl — hvad var dit warm-up sæt?",
    whenLabel: "5m",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "cm-2",
    who: "@maria.lift",
    tier: "Beast",
    content: "Sygt sæt. Du er klar til 180 til næste cyklus.",
    whenLabel: "12m",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "cm-3",
    who: "@Munk",
    tier: "Legend",
    content: "Bemærk: hold lidt længere pause mellem sættene næste gang. +1.",
    whenLabel: "32m",
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
  },
];

/**
 * Comments for a single post. Returns null in demo mode so callers
 * can show mock content; returns [] in connected mode when none exist.
 */
export async function getComments(postId: string, limit = 50): Promise<Comment[] | null> {
  const supabase = await createClient();
  if (!supabase) return MOCK_COMMENTS;

  // Mock-feed posts won't exist in DB — short-circuit those.
  if (postId.startsWith("m") && postId.length <= 4) return MOCK_COMMENTS;

  const { data, error } = await supabase
    .from("post_comments")
    .select(
      `
      id, content, created_at,
      member:members(handle, tier)
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((c) => {
    const m = Array.isArray(c.member) ? c.member[0] : c.member;
    return {
      id: c.id,
      who: m ? `@${m.handle}` : "@member",
      tier: m?.tier ?? "Lifter",
      content: c.content,
      whenLabel: humanWhen(c.created_at),
      createdAt: c.created_at,
    };
  });
}
