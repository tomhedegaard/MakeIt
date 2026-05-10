"use client";

import { useRef, useState, useTransition } from "react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { sendMessageAction } from "@/app/(app)/messages/actions";
import AudioRecorder from "./AudioRecorder";

const CHAT_MEDIA_BUCKET = "chat-media";

/**
 * Chat composer. Asymmetric capability gate:
 *   - Members:    text, image, audio
 *   - Coaches:    text, image, audio, video
 *
 * The "video" branch is ONLY rendered when `canSendVideo` is true.
 * The DB enforces the same constraint via RLS, so this is a UX
 * affordance rather than a security boundary.
 *
 * Media uploads go straight from the browser to Supabase Storage
 * with the conversation_id as the first path segment (matches the
 * RLS policy in 0018_chat_media.sql). The server action then
 * inserts the message row referencing that path. Failure modes:
 *   - Storage upload fails: surface "Upload fejlede", don't insert
 *   - Insert fails (e.g. video from non-coach): surface "Afvist",
 *     attempt to delete the orphaned upload (best-effort)
 */
export default function Composer({
  conversationId,
  canSendVideo,
}: {
  conversationId: string;
  canSendVideo: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  function flashError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }

  /* -------------------------------------------------- *
   * Text send
   * -------------------------------------------------- */

  async function handleSendText() {
    const body = text.trim();
    if (!body || pending) return;
    setText("");
    startTransition(async () => {
      const res = await sendMessageAction({
        conversationId,
        kind: "text",
        body,
      });
      if (!res.ok) {
        setText(body); // restore
        flashError(reasonToLabel(res.reason));
      }
    });
  }

  /* -------------------------------------------------- *
   * Image / video — file-picker upload then insert
   * -------------------------------------------------- */

  async function handleFile(file: File, kind: "image" | "video") {
    if (pending) return;

    if (kind === "image" && !file.type.startsWith("image/")) {
      flashError("Vælg et billede");
      return;
    }
    if (kind === "video" && !file.type.startsWith("video/")) {
      flashError("Vælg en video");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      flashError("Filen er for stor (max 100 MB)");
      return;
    }

    const supabase = createBrowserSupabase();
    if (!supabase) {
      flashError("Storage er ikke tilgængelig i demo-mode");
      return;
    }

    const ext = (file.name.split(".").pop() ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 6) || (kind === "image" ? "jpg" : "mp4");
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${conversationId}/${stamp}-${rand}.${ext}`;

    setError(null);
    startTransition(async () => {
      const { error: upErr } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (upErr) {
        flashError("Upload fejlede: " + upErr.message);
        return;
      }

      const res = await sendMessageAction({
        conversationId,
        kind,
        mediaPath: path,
        mediaMime: file.type,
      });
      if (!res.ok) {
        // Clean up the orphaned upload — RLS lets the sender delete
        // their own files (matched via messages.media_path), but
        // since the row never inserted we use direct path delete.
        await supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]).catch(() => undefined);
        flashError(reasonToLabel(res.reason));
      }
    });
  }

  /* -------------------------------------------------- *
   * Audio — Blob comes from the recorder, then upload + insert
   * -------------------------------------------------- */

  async function handleAudioSubmit(blob: Blob, durationSec: number, mime: string) {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      flashError("Storage er ikke tilgængelig");
      throw new Error("no_storage");
    }
    const ext = mime.includes("mp4") ? "m4a" : mime.includes("webm") ? "webm" : "ogg";
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${conversationId}/${stamp}-${rand}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        contentType: mime,
        upsert: false,
      });
    if (upErr) {
      flashError("Upload fejlede");
      throw upErr;
    }

    const res = await sendMessageAction({
      conversationId,
      kind: "audio",
      mediaPath: path,
      mediaMime: mime,
      mediaDurationSec: durationSec,
    });
    if (!res.ok) {
      await supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]).catch(() => undefined);
      flashError(reasonToLabel(res.reason));
      throw new Error(res.reason ?? "send_failed");
    }
    setRecording(false);
  }

  /* -------------------------------------------------- *
   * Render
   * -------------------------------------------------- */

  if (recording) {
    return (
      <div className="border-t hairline px-4 py-3">
        <AudioRecorder
          onCancel={() => setRecording(false)}
          onSubmit={handleAudioSubmit}
          disabled={pending}
        />
        {error ? (
          <p className="mt-2 text-[10px] font-mono text-red-400">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border-t hairline px-3 py-3 flex items-end gap-2">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f, "image");
          e.target.value = "";
        }}
      />
      {canSendVideo ? (
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f, "video");
            e.target.value = "";
          }}
        />
      ) : null}

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={pending}
          className="btn btn-sm btn-ghost"
          aria-label="Vedhæft billede"
          title="Billede"
        >
          📷
        </button>
        <button
          type="button"
          onClick={() => setRecording(true)}
          disabled={pending}
          className="btn btn-sm btn-ghost"
          aria-label="Optag lydbesked"
          title="Lyd"
        >
          🎙️
        </button>
        {canSendVideo ? (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={pending}
            className="btn btn-sm btn-ghost"
            aria-label="Vedhæft video"
            title="Video"
          >
            🎬
          </button>
        ) : null}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
          }
        }}
        placeholder="Skriv en besked…"
        rows={2}
        className="flex-1 min-w-0 resize-none rounded-lg border hairline px-3 py-2 text-sm bg-bg leading-relaxed focus:outline-none focus:border-line-bright"
        disabled={pending}
      />

      <button
        type="button"
        onClick={handleSendText}
        disabled={pending || !text.trim()}
        className="btn btn-primary btn-sm self-end"
      >
        {pending ? "…" : "Send"}
      </button>

      {error ? (
        <p className="absolute mt-2 text-[10px] font-mono text-red-400">{error}</p>
      ) : null}
    </div>
  );
}

function reasonToLabel(reason: string | undefined): string {
  switch (reason) {
    case "video_not_allowed":
      return "Du kan ikke sende video";
    case "auth":
      return "Du er ikke logget ind";
    case "no_coach":
      return "Ingen coach tilgængelig endnu";
    case "empty":
      return "Skriv noget først";
    case "no_media":
      return "Vedhæft en fil først";
    default:
      return "Kunne ikke sende — prøv igen";
  }
}
