"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProgramAction } from "@/app/coach/programs/actions";

const TYPES = ["Strength", "Hypertrophy", "Hybrid", "Specialization"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];

/**
 * Inline "new program" form on /coach/programs. Creates a draft
 * `programs` row (unpublished) and routes straight into the builder.
 */
export default function NewProgramForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [weeks, setWeeks] = useState(8);
  const [level, setLevel] = useState(LEVELS[1]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createProgramAction({ code, name, type, weeks, level });
      if (res.ok && res.code) {
        router.push(`/coach/programs/${encodeURIComponent(res.code)}`);
      } else {
        setError(res.error ?? "Kunne ikke oprette programmet");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary"
      >
        + Nyt program
      </button>
    );
  }

  return (
    <div className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
      <div className="eyebrow">Nyt program</div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs text-fg-dim">Kode (unik)</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="fx STR-12"
            className="input w-full"
            maxLength={24}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-fg-dim">Navn</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="fx PR-Block"
            className="input w-full"
            maxLength={80}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-fg-dim">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input w-full"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-fg-dim">Niveau</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="input w-full"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-fg-dim">Uger</span>
          <input
            type="number"
            min={1}
            max={52}
            value={weeks}
            onChange={(e) => setWeeks(parseInt(e.target.value, 10) || 1)}
            className="input w-full"
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "var(--danger, #C97B3E)" }}>
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !code.trim() || !name.trim()}
          className="btn btn-primary"
        >
          {pending ? "Opretter…" : "Opret + byg"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-ghost"
        >
          Annullér
        </button>
      </div>
    </div>
  );
}
