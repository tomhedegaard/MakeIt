"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postToCirkelAction } from "@/app/(app)/mind/cirkler/actions";

export default function CirkelPostForm({
  cirkelId,
}: {
  cirkelId: string;
}) {
  const [body, setBody] = useState("");
  const [share, setShare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await postToCirkelAction(formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setBody("");
      setShare(false);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-2xl border hairline bg-bg-2/30 p-5">
      <input type="hidden" name="cirkel_id" value={cirkelId} />
      <input type="hidden" name="share_mind_check" value={share ? "1" : "0"} />

      <div className="eyebrow">Ugens check-in</div>

      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 600))}
        maxLength={600}
        rows={4}
        required
        placeholder="Hvordan står ugen — kort?"
        className="w-full rounded-xl bg-bg/60 border hairline px-4 py-3 text-base resize-none focus:outline-none focus:border-fg/40"
      />
      <div className="flex items-center justify-between text-xs text-fg-dim">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={share}
            onChange={(e) => setShare(e.target.checked)}
            className="accent-fg"
          />
          Del mit dagens mind-check signal (energi/stress/fokus) med cirklet
        </label>
        <span className="tabular-nums">{body.length} / 600</span>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {pending ? "Sender..." : saved ? "Sendt — opdater næste uge" : "Post i cirklet"}
        </button>
      </div>
    </form>
  );
}
