"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveDemoAssets } from "@/lib/data/exercises";
import { uploadDemoAssetAction } from "@/app/coach/exercises/actions";

const BUCKET = "exercise-demos";

type SlotKey = "webm" | "mp4" | "poster";
type SlotState = "idle" | "uploading" | "done" | "error";

const SLOTS: { key: SlotKey; label: string; ext: string; accept: string; mime: string }[] = [
  { key: "webm",   label: "Demo-loop (WebM)", ext: "webm", accept: "video/webm", mime: "video/webm" },
  { key: "mp4",    label: "Demo-loop (MP4)",  ext: "mp4",  accept: "video/mp4",  mime: "video/mp4" },
  { key: "poster", label: "Poster (JPG)",     ext: "jpg",  accept: "image/jpeg", mime: "image/jpeg" },
];

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Three-slot uploader for an exercise's demo trio. Each file uploads on
 * selection to `exercise-demos/{slug}.{ext}` (upsert). A successful WebM
 * upload triggers uploadDemoAssetAction, which persists demo_asset_url.
 * The mp4/poster slots only place files at their derived paths.
 */
export default function DemoAssetUploader({
  exerciseId,
  slug,
  initialDemoAssetUrl,
}: {
  exerciseId: string;
  slug: string;
  initialDemoAssetUrl: string | null;
}) {
  const [demoAssetUrl, setDemoAssetUrl] = useState(initialDemoAssetUrl);
  const [state, setState] = useState<Record<SlotKey, SlotState>>({
    webm: "idle",
    mp4: "idle",
    poster: "idle",
  });
  const [errors, setErrors] = useState<Partial<Record<SlotKey, string>>>({});
  const [, startPersist] = useTransition();

  const supabase = createClient();

  async function handleFile(slotKey: SlotKey, ext: string, mime: string, file: File) {
    setErrors((e) => ({ ...e, [slotKey]: undefined }));

    if (file.size > MAX_BYTES) {
      setState((s) => ({ ...s, [slotKey]: "error" }));
      setErrors((e) => ({ ...e, [slotKey]: "Filen er over 5 MB" }));
      return;
    }
    if (!supabase) {
      setState((s) => ({ ...s, [slotKey]: "error" }));
      setErrors((e) => ({ ...e, [slotKey]: "Supabase ikke konfigureret" }));
      return;
    }

    setState((s) => ({ ...s, [slotKey]: "uploading" }));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${slug}.${ext}`, file, {
        cacheControl: "3600",
        contentType: mime,
        upsert: true,
      });

    if (error) {
      setState((s) => ({ ...s, [slotKey]: "error" }));
      setErrors((e) => ({ ...e, [slotKey]: error.message }));
      return;
    }

    setState((s) => ({ ...s, [slotKey]: "done" }));

    // WebM is canonical — persist demo_asset_url once it lands.
    if (slotKey === "webm") {
      startPersist(async () => {
        const res = await uploadDemoAssetAction({ exerciseId, slug });
        if (res.ok && res.demoAssetUrl) {
          setDemoAssetUrl(res.demoAssetUrl);
        } else {
          setErrors((e) => ({ ...e, webm: res.error ?? "Kunne ikke gemme" }));
        }
      });
    }
  }

  const preview = demoAssetUrl ? resolveDemoAssets(demoAssetUrl) : null;

  return (
    <section className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
      <div className="eyebrow">Demo-asset</div>
      <p className="text-xs text-fg-dim">
        Upload de tre filer fra motion-designeren. WebM aktiverer demo-loopet
        på /train/exercises — MP4 er fallback, JPG er poster mens loopet
        loader.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {SLOTS.map((slot) => (
          <label key={slot.key} className="space-y-1.5 block">
            <span className="text-xs text-fg-dim">{slot.label}</span>
            <input
              type="file"
              accept={slot.accept}
              disabled={state[slot.key] === "uploading"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(slot.key, slot.ext, slot.mime, file);
              }}
              className="block w-full text-xs text-fg-dim file:mr-3 file:rounded-md file:border-0 file:bg-bg-3 file:px-3 file:py-1.5 file:text-fg"
            />
            <span className="text-[11px] font-mono text-fg-faint">
              {state[slot.key] === "uploading" && "Uploader…"}
              {state[slot.key] === "done" && `Uploadet — ${slug}.${slot.ext}`}
              {state[slot.key] === "error" && (errors[slot.key] ?? "Fejl")}
            </span>
          </label>
        ))}
      </div>

      {preview ? (
        <div className="surface rounded-lg p-4">
          <div className="eyebrow mb-2">Forhåndsvisning</div>
          <video
            key={preview.webm}
            autoPlay
            loop
            muted
            playsInline
            poster={preview.poster}
            className="rounded-lg w-full max-w-[200px]"
          >
            <source src={preview.webm} type="video/webm" />
            <source src={preview.mp4} type="video/mp4" />
          </video>
        </div>
      ) : (
        <p className="text-[11px] font-mono text-fg-faint">
          Intet demo-loop endnu — upload en WebM for at aktivere det.
        </p>
      )}
    </section>
  );
}
