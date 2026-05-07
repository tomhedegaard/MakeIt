"use client";

import { useOptimistic, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  addCommentAction,
  loadCommentsAction,
  toggleReactionAction,
} from "@/app/(app)/community/actions";
import type { FeedPost, Comment } from "@/lib/data/community";
import { renderMentions } from "@/lib/text/mentions";

function MentionText({ text }: { text: string }) {
  const parts = renderMentions(text);
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "mention" ? (
          <span key={i} className="text-fg font-medium">
            @{p.handle}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </>
  );
}

export default function PostCard({ post }: { post: FeedPost }) {
  const [optimistic, setOptimistic] = useOptimistic<
    { reacted: boolean; count: number },
    "toggle"
  >({ reacted: post.reactedByMe, count: post.reactionsCount }, (state) => ({
    reacted: !state.reacted,
    count: state.reacted ? state.count - 1 : state.count + 1,
  }));
  const [, startTransition] = useTransition();

  // Comments expansion state
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  // Composer state
  const [draft, setDraft] = useState("");
  const [posting, startPosting] = useTransition();

  function handleToggleReaction() {
    startTransition(async () => {
      setOptimistic("toggle");
      await toggleReactionAction(post.id);
    });
  }

  async function expand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (comments === null && !loadingComments) {
      setLoadingComments(true);
      try {
        const list = await loadCommentsAction(post.id);
        setComments(list);
      } finally {
        setLoadingComments(false);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    // Optimistic comment so the user sees immediate feedback.
    const optimistic: Comment = {
      id: `pending-${Date.now()}`,
      who: "@dig",
      tier: "Lifter",
      content,
      whenLabel: "lige nu",
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...(prev ?? []), optimistic]);
    setCommentsCount((c) => c + 1);
    setDraft("");

    startPosting(async () => {
      const res = await addCommentAction({ postId: post.id, content });
      if (!res.ok) {
        // Roll back on failure
        setComments((prev) => prev?.filter((c) => c.id !== optimistic.id) ?? null);
        setCommentsCount((c) => Math.max(0, c - 1));
      } else {
        // Refresh from server so we have the real ID + handle.
        const fresh = await loadCommentsAction(post.id);
        setComments(fresh);
      }
    });
  }

  return (
    <article className="surface-2 rounded-2xl p-5 lift">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
            {post.who.slice(1, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm truncate">{post.who}</div>
            <div className="eyebrow text-[10px]">{post.tier}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {post.isPr ? (
            <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
              ★ PR
            </span>
          ) : null}
          {post.formcheck ? (
            <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
              AI
            </span>
          ) : null}
          <span className="numeric text-xs text-fg-faint">{post.whenLabel}</span>
        </div>
      </div>

      <p className="text-fg/90 text-sm md:text-base leading-relaxed mb-4 whitespace-pre-wrap">
        <MentionText text={post.content} />
      </p>

      <div className="border-t hairline pt-3 flex items-center gap-1 text-xs font-mono text-fg-dim">
        <button
          type="button"
          onClick={handleToggleReaction}
          aria-pressed={optimistic.reacted}
          className={cn(
            "px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors",
            optimistic.reacted
              ? "bg-bg-3 text-fg"
              : "hover:text-fg hover:bg-bg-3"
          )}
        >
          <span>{optimistic.reacted ? "✓" : "+"}</span>
          <span className="numeric">{optimistic.count}</span>
          <span>Reps</span>
        </button>
        <button
          type="button"
          onClick={expand}
          aria-expanded={expanded}
          className={cn(
            "px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors",
            expanded ? "bg-bg-3 text-fg" : "hover:text-fg hover:bg-bg-3"
          )}
        >
          <span className="numeric">{commentsCount}</span>
          <span>Kommentar{commentsCount === 1 ? "" : "er"}</span>
        </button>
        <button
          type="button"
          className="ml-auto px-3 py-1.5 rounded-md hover:text-fg hover:bg-bg-3"
        >
          Del
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 border-t hairline pt-4 space-y-4">
          {loadingComments ? (
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
              Henter kommentarer…
            </p>
          ) : comments && comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <div className="size-7 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
                    {c.who.slice(1, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm">{c.who}</span>
                      <span className="numeric text-[10px] text-fg-faint">
                        {c.whenLabel}
                      </span>
                    </div>
                    <p className="text-sm text-fg/90 leading-relaxed whitespace-pre-wrap">
                      <MentionText text={c.content} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
              Ingen kommentarer endnu — vær den første.
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              placeholder="Skriv en kommentar… brug @handle for at tagge"
              className="field py-2 min-h-[40px] resize-none flex-1 text-sm"
              disabled={posting}
            />
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={posting || !draft.trim()}
            >
              {posting ? "…" : "Send"}
            </button>
          </form>

          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            @-tags sender en mail-notifikation til den nævnte
          </p>
        </div>
      ) : null}
    </article>
  );
}
