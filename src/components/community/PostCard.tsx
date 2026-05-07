"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toggleReactionAction } from "@/app/(app)/community/actions";
import type { FeedPost } from "@/lib/data/community";

export default function PostCard({ post }: { post: FeedPost }) {
  const [optimistic, setOptimistic] = useOptimistic<
    { reacted: boolean; count: number },
    "toggle"
  >({ reacted: post.reactedByMe, count: post.reactionsCount }, (state) => ({
    reacted: !state.reacted,
    count: state.reacted ? state.count - 1 : state.count + 1,
  }));
  const [, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      setOptimistic("toggle");
      await toggleReactionAction(post.id);
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
        {post.content}
      </p>

      <div className="border-t hairline pt-3 flex items-center gap-1 text-xs font-mono text-fg-dim">
        <button
          type="button"
          onClick={handleToggle}
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
          className="px-3 py-1.5 rounded-md hover:text-fg hover:bg-bg-3 flex items-center gap-2"
        >
          <span className="numeric">{post.commentsCount}</span>
          <span>Kommentar</span>
        </button>
        <button
          type="button"
          className="ml-auto px-3 py-1.5 rounded-md hover:text-fg hover:bg-bg-3"
        >
          Del
        </button>
      </div>
    </article>
  );
}
