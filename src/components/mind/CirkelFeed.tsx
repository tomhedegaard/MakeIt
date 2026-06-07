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
  if (posts.length === 0) {
    return (
      <p className="text-fg-dim leading-relaxed">
        Ingen poster i cirklet endnu. Vær den første denne uge — én sætning er nok.
      </p>
    );
  }
  return (
    <div className="space-y-8">
      {posts.map((p) => (
        <article key={p.id} className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-lg">{p.author_handle}</span>
            <time className="text-fg-dim text-xs" dateTime={p.posted_at}>
              {formatRelative(p.posted_at)}
            </time>
          </div>
          {p.mind_share ? (
            <div className="flex flex-wrap gap-2 text-xs text-fg-dim">
              {p.mind_share.energy !== undefined ? (
                <span className="rounded-full border hairline px-2.5 py-1">
                  energi {p.mind_share.energy}/5
                </span>
              ) : null}
              {p.mind_share.stress !== undefined ? (
                <span className="rounded-full border hairline px-2.5 py-1">
                  stress {p.mind_share.stress}/5
                </span>
              ) : null}
              {p.mind_share.focus !== undefined ? (
                <span className="rounded-full border hairline px-2.5 py-1">
                  fokus {p.mind_share.focus}/5
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

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 1) return "lige nu";
  if (hrs < 24) return `${hrs} t siden`;
  const days = Math.floor(hrs / 24);
  return `${days} dage siden`;
}
