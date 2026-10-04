"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Avatar from "@/components/ui/Avatar";
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

// Feed actions: selected = ink fill like a selected chip, hover = a quiet bg-2.
// The 44 px height stays literal on each button: touch-targets.test counts it.
const TOGGLE = "px-2 sm:px-3 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-colors duration-200 ease-out";
const TOGGLE_ON = "bg-fg text-bg";
const TOGGLE_OFF = "hover:text-fg hover:bg-bg-2";

export default function PostCard({ post }: { post: FeedPost }) {
  const t = useTranslations("Community.post");
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

  const [copied, setCopied] = useState(false);

  // Web Share where the platform has it (the phone's own share sheet);
  // otherwise the post's link goes on the clipboard.
  async function share() {
    const url = `${window.location.origin}/community#post-${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.who, text: post.content, url });
      } catch {
        // Dismissed share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — leave the button as it was.
    }
  }

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
      who: t("optimisticWho"),
      tier: "Lifter",
      content,
      whenLabel: t("optimisticWhen"),
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
    <article id={`post-${post.id}`} className="surface-2 rounded-2xl p-5 lift">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar handle={post.who} />
          <div className="min-w-0">
            <div className="text-copy truncate">{post.who}</div>
            <div className="eyebrow text-micro">{post.tier}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {post.isPr ? (
            <span className="numeric text-micro border hairline-strong px-2 py-0.5">
              {t("prBadge")}
            </span>
          ) : null}
          {post.formcheck ? (
            <span className="numeric text-micro border hairline-strong px-2 py-0.5">
              AI
            </span>
          ) : null}
          <span className="numeric text-micro text-fg-faint">{post.whenLabel}</span>
        </div>
      </div>

      <p className="text-fg-body text-copy leading-relaxed mb-4 whitespace-pre-wrap">
        <MentionText text={post.content} />
      </p>

      <div className="border-t hairline pt-3 flex items-center gap-1 text-micro text-fg-dim">
        <button
          type="button"
          onClick={handleToggleReaction}
          aria-pressed={optimistic.reacted}
          className={cn("min-h-11", TOGGLE, optimistic.reacted ? TOGGLE_ON : TOGGLE_OFF)}
        >
          <span>{t("hep")}</span>
          <span className="tabular">{t("cheerers", { count: optimistic.count })}</span>
        </button>
        <button
          type="button"
          onClick={expand}
          aria-expanded={expanded}
          className={cn("min-h-11", TOGGLE, expanded ? TOGGLE_ON : TOGGLE_OFF)}
        >
          <span className="numeric">{commentsCount}</span>
          <span>
            {commentsCount === 1 ? t("commentsOne") : t("commentsOther")}
          </span>
        </button>
        <button
          type="button"
          onClick={share}
          className={cn("min-h-11", TOGGLE, TOGGLE_OFF, "ml-auto")}
        >
          {copied ? t("shareCopied") : t("share")}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 border-t hairline pt-4 space-y-4">
          {loadingComments ? (
            <p className="text-micro text-fg-faint">
              {t("loadingComments")}
            </p>
          ) : comments && comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar handle={c.who} className="size-7" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-copy">{c.who}</span>
                      <span className="numeric text-micro text-fg-faint">
                        {c.whenLabel}
                      </span>
                    </div>
                    <p className="text-copy text-fg-body leading-relaxed whitespace-pre-wrap">
                      <MentionText text={c.content} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-micro text-fg-faint">
              {t("noComments")}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              aria-label={t("commentLabel")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              placeholder={t("commentPlaceholder")}
              className="field py-2 min-h-[40px] resize-none flex-1 text-copy"
              disabled={posting}
            />
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={posting || !draft.trim()}
            >
              {posting ? t("sending") : t("send")}
            </button>
          </form>

          <p className="text-micro text-fg-faint">
            {t("mentionHint")}
          </p>
        </div>
      ) : null}
    </article>
  );
}
