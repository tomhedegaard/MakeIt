"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCirkelAction } from "./actions";

export default function CreateCirkelForm() {
  const [name, setName] = useState("");
  const [maxMembers, setMaxMembers] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createCirkelAction(formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setName("");
      setMaxMembers(6);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-2xl border hairline bg-bg-2/30 p-5 space-y-4"
    >
      <div className="eyebrow">Opret cirkel</div>

      <label className="block space-y-1.5">
        <span className="text-fg-dim text-xs uppercase tracking-wide">Navn</span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          required
          minLength={2}
          maxLength={80}
          placeholder="fx 'Beast Crew · København'"
          className="w-full rounded-xl bg-bg/60 border hairline px-4 py-3 text-base focus:outline-none focus:border-fg/40"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-fg-dim text-xs uppercase tracking-wide">
          Max medlemmer (3-10)
        </span>
        <input
          type="number"
          name="max_members"
          value={maxMembers}
          onChange={(e) => setMaxMembers(Number(e.target.value))}
          min={3}
          max={10}
          className="w-full rounded-xl bg-bg/60 border hairline px-4 py-3 text-base tabular-nums focus:outline-none focus:border-fg/40"
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || name.trim().length < 2}
        className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {pending ? "Opretter..." : "Opret cirkel"}
      </button>
    </form>
  );
}
