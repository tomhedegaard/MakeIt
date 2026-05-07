"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to public.posts inserts via Supabase realtime. When new
 * posts arrive after the page rendered, surface a "N nye posts —
 * opdater" pill the user can tap to refresh the server-rendered feed.
 *
 * No-op in demo mode (createClient returns null).
 */
export default function RealtimeIndicator() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("public-posts-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => setCount((c) => c + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => {
        setCount(0);
        router.refresh();
      }}
      className="fixed left-1/2 -translate-x-1/2 top-[72px] lg:top-6 z-30 surface-2 rounded-full px-4 py-2 flex items-center gap-2 lift"
      style={{ borderColor: "var(--line-bright)" }}
    >
      <span className="pulse-dot" aria-hidden />
      <span className="text-xs font-mono uppercase tracking-[0.14em] text-fg">
        {count} nyt{count === 1 ? "" : "e"} post{count === 1 ? "" : "s"} — opdatér
      </span>
    </button>
  );
}
