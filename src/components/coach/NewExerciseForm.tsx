"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createExerciseAction } from "@/app/coach/exercises/actions";

/**
 * Inline "new exercise" form on /coach/exercises. Creates a minimal
 * draft (slug + name, unpublished) and routes into the editor.
 */
export default function NewExerciseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createExerciseAction({ name, slug: slug || undefined });
      if (res.ok && res.slug) {
        router.push(`/coach/exercises/${encodeURIComponent(res.slug)}`);
      } else {
        setError(res.error ?? "Kunne ikke oprette øvelsen");
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
        + Ny øvelse
      </button>
    );
  }

  return (
    <div className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
      <div className="eyebrow">Ny øvelse</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs text-fg-dim">Navn</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="fx Bulgarian Split Squat"
            className="input w-full"
            maxLength={80}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-fg-dim">
            Slug (valgfri — dannes fra navn)
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="bulgarian-split-squat"
            className="input w-full"
            maxLength={48}
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "#C97B3E" }}>
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="btn btn-primary"
        >
          {pending ? "Opretter…" : "Opret + rediger"}
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
