import { useTranslations } from "next-intl";

interface Post {
  id: string;
  author_handle: string;
  posted_at: string;
  body: string;
  mind_share: { energy?: number; stress?: number; focus?: number } | null;
  reactions: { fire: number; flex: number; heart: number };
}

/**
 * Asynkron cirkel feed render. Each post: handle + timestamp,
 * optional mind-share signal pills, body text, reaction counts.
 * Reactions UI (post a reaction) is deferred — out of MH-10 scope.
 */
export default function CirkelFeed({ posts }: { posts: Post[] }) {
  const t = useTranslations("Mind.cirkelFeed");
  if (posts.length === 0) {
    return <p className="text-fg-dim leading-relaxed">{t("empty")}</p>;
  }
  return (
    <div className="space-y-8">
      {posts.map((p) => (
        <article key={p.id} className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-lg">{p.author_handle}</span>
            <time className="text-fg-dim text-xs" dateTime={p.posted_at}>
              {formatRelative(p.posted_at, t)}
            </time>
          </div>
          {p.mind_share ? (
            <div className="flex flex-wrap gap-2 text-xs text-fg-dim">
              {p.mind_share.energy !== undefined ? (
                <span className="rounded-full border hairline px-2.5 py-1">
                  {t("energy", { value: p.mind_share.energy })}
                </span>
              ) : null}
              {p.mind_share.stress !== undefined ? (
                <span className="rounded-full border hairline px-2.5 py-1">
                  {t("stress", { value: p.mind_share.stress })}
                </span>
              ) : null}
              {p.mind_share.focus !== undefined ? (
                <span className="rounded-full border hairline px-2.5 py-1">
                  {t("focus", { value: p.mind_share.focus })}
                </span>
              ) : null}
            </div>
          ) : null}
          <p className="text-fg-dim leading-relaxed whitespace-pre-wrap">{p.body}</p>
          <div className="flex items-center gap-3 text-xs text-fg-dim pt-1">
            <span>🔥 {p.reactions.fire}</span>
            <span>💪 {p.reactions.flex}</span>
            <span>❤ {p.reactions.heart}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatRelative(
  iso: string,
  t: ReturnType<typeof useTranslations<"Mind.cirkelFeed">>,
): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 1) return t("ago.now");
  if (hrs < 24) return t("ago.hours", { count: hrs });
  const days = Math.floor(hrs / 24);
  return t("ago.days", { count: days });
}
