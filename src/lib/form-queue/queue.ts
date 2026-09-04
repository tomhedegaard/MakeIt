/**
 * Set-scoped form-check queue — athlete films a lift/set, Munk reviews.
 *
 * Pure: no IO. Demo fixtures live here so /session + /coach/queue stay
 * demonstrable without Supabase. The engine only reads a form-check
 * when status=reviewed AND reviewedAt is set.
 */

export const FORM_QUEUE_TYPE = "form_check" as const;

export type FormQueueStatus = "pending" | "reviewed";

export type FormQueueDraft = {
  memberId: string;
  memberHandle: string;
  exerciseName: string;
  /** 1-based set number on the session exercise. */
  setIndex: number;
  sessionId?: string | null;
  aiScore?: number | null;
  aiHeadline?: string | null;
  aiPos?: string[];
  aiNeg?: string[];
  aiFix?: string | null;
  aiDraftedReply?: string | null;
  videoUrl?: string | null;
};

export type FormQueueItem = {
  id: string;
  type: typeof FORM_QUEUE_TYPE;
  memberId: string;
  memberHandle: string;
  exerciseName: string;
  setIndex: number;
  sessionId: string | null;
  status: FormQueueStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  coachNotes: string | null;
  voiceNoteUrl: string | null;
  voiceNoteDurationSec: number | null;
  aiScore: number | null;
  aiHeadline: string | null;
  aiPos: string[];
  aiNeg: string[];
  aiFix: string | null;
  aiDraftedReply: string | null;
  videoUrl: string | null;
  createdAt: string;
};

export function liftLabel(
  item: Pick<FormQueueItem, "exerciseName" | "setIndex">,
): string {
  const name = item.exerciseName.trim() || "Form-check";
  if (!item.setIndex || item.setIndex < 1) return name;
  return `${name} · sæt ${item.setIndex}`;
}

/**
 * Bind a film/upload to one athlete + lift + set. Always type=form_check,
 * always pending until Munk reviews.
 */
export function createFormQueueItem(
  draft: FormQueueDraft,
  now = new Date(),
): FormQueueItem {
  const setIndex = Math.max(1, Math.floor(draft.setIndex) || 1);
  return {
    id: `fc-${now.getTime()}-${setIndex}`,
    type: FORM_QUEUE_TYPE,
    memberId: draft.memberId,
    memberHandle: draft.memberHandle,
    exerciseName: draft.exerciseName,
    setIndex,
    sessionId: draft.sessionId ?? null,
    status: "pending",
    reviewedAt: null,
    reviewedBy: null,
    coachNotes: null,
    voiceNoteUrl: null,
    voiceNoteDurationSec: null,
    aiScore: draft.aiScore ?? null,
    aiHeadline: draft.aiHeadline ?? null,
    aiPos: draft.aiPos ?? [],
    aiNeg: draft.aiNeg ?? [],
    aiFix: draft.aiFix ?? null,
    aiDraftedReply: draft.aiDraftedReply ?? null,
    videoUrl: draft.videoUrl ?? null,
    createdAt: now.toISOString(),
  };
}

export function markFormQueueReviewed(
  item: FormQueueItem,
  input: {
    notes: string;
    voiceNoteUrl?: string | null;
    voiceNoteDurationSec?: number | null;
    reviewedAt?: string;
    reviewedBy?: string;
  },
): FormQueueItem {
  return {
    ...item,
    status: "reviewed",
    reviewedAt: input.reviewedAt ?? new Date().toISOString(),
    reviewedBy: input.reviewedBy ?? "munk",
    coachNotes: input.notes.trim() || null,
    voiceNoteUrl: input.voiceNoteUrl ?? item.voiceNoteUrl,
    voiceNoteDurationSec:
      input.voiceNoteDurationSec ?? item.voiceNoteDurationSec,
  };
}

/**
 * Engine hook: only reviewed craft is a signal. Pending films stay
 * out of Adaptive input even if a score exists.
 */
export function formCheckReadableByEngine(check: {
  status?: FormQueueStatus | null;
  reviewedAt: string | null;
}): boolean {
  if (check.status && check.status !== "reviewed") return false;
  return typeof check.reviewedAt === "string" && check.reviewedAt.length > 0;
}

export function pendingFormQueue(items: FormQueueItem[]): FormQueueItem[] {
  return items.filter((i) => i.status === "pending" && !i.reviewedAt);
}

export function threadsForLift(
  items: FormQueueItem[],
  exerciseName: string,
): FormQueueItem[] {
  const key = exerciseName.trim().toLowerCase();
  return items
    .filter((i) => i.exerciseName.trim().toLowerCase() === key)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Demo fixtures Munk walks: one film still waiting, one already
 * answered with a voice note. Bound to TODAY_SESSION lifts.
 */
export function demoFormQueueItems(now = new Date()): FormQueueItem[] {
  const pendingCreated = new Date(now.getTime() - 1000 * 60 * 32);
  const reviewedCreated = new Date(now.getTime() - 1000 * 60 * 60 * 8);
  const reviewedAt = new Date(now.getTime() - 1000 * 60 * 60 * 4);

  const pending = createFormQueueItem(
    {
      memberId: "m-nina",
      memberHandle: "nina_dl",
      exerciseName: "Conventional Deadlift",
      setIndex: 2,
      sessionId: "sess-2026-05-05",
      aiScore: 79,
      aiHeadline: "Stærkt løft — hyperekstension på toppen",
      aiPos: [
        "Bar holder kontakt med kroppen hele vejen op",
        "Lats engageret fra setup",
        "God pace — ingen tøven ved knæene",
      ],
      aiNeg: [
        "Hyperextension i lock-out (læn 5° tilbage)",
        "Hofte stiger marginalt før skuldrene",
      ],
      aiFix:
        'Lås ud med squeeze i baller, ikke ved at læne tilbage. Tænk "stå op" frem for "læn tilbage".',
      aiDraftedReply:
        "Stærkt løft, Nina — baren holder kontakt hele vejen op. Du låner lidt for langt tilbage i toppen; lås ud ved at knibe ballerne, ikke ved at læne dig bagud.",
    },
    pendingCreated,
  );

  const reviewedBase = createFormQueueItem(
    {
      memberId: "mock-munk",
      memberHandle: "Munk",
      exerciseName: "Back Squat",
      setIndex: 4,
      sessionId: "sess-2026-05-05",
      aiScore: 84,
      aiHeadline: "Solid sæt — let knæ-valgus i hullet",
      aiPos: [
        "Bardepth ramt på alle 3 reps",
        "Konsistent bar-path",
        "God spinal kontrol",
      ],
      aiNeg: ["Højre knæ kollapser let indad på rep 2 og 3"],
      aiFix:
        'Driv knæene aktivt udad i bunden ("spread the floor"). Hold 1 sek pause i bunden næste sæt.',
    },
    reviewedCreated,
  );

  const reviewed = markFormQueueReviewed(reviewedBase, {
    notes:
      "Enig. Næste session: pause-squat med 80%. Film fra siden. — Munk",
    voiceNoteUrl: "demo:voice",
    voiceNoteDurationSec: 18,
    reviewedAt: reviewedAt.toISOString(),
    reviewedBy: "munk",
  });

  const extraPending = createFormQueueItem(
    {
      memberId: "m-kasper",
      memberHandle: "kasper_s",
      exerciseName: "Back Squat",
      setIndex: 3,
      sessionId: "sess-2026-05-05",
      aiScore: 84,
      aiHeadline: "Solid sæt — let knæ-valgus i hullet",
      aiPos: ["Bardepth ramt på alle 3 reps", "Konsistent bar-path"],
      aiNeg: ["Højre knæ kollapser let indad på rep 2 og 3"],
      aiFix: 'Driv knæene aktivt udad i bunden ("spread the floor").',
      aiDraftedReply:
        "Solidt sæt, Kasper — dybde ramt. Højre knæ falder lidt indad; driv knæene udad i bunden.",
    },
    new Date(now.getTime() - 1000 * 60 * 60 * 6),
  );

  const extraPending2 = createFormQueueItem(
    {
      memberId: "m-maria",
      memberHandle: "maria.lift",
      exerciseName: "Paused Bench",
      setIndex: 1,
      aiScore: 87,
      aiHeadline: "Solid pause-bench — kontroller ekscentrisk lidt mere",
      aiPos: ["Solid pause i bunden", "Ben i gulvet hele sættet"],
      aiNeg: ["Lidt for hurtig på vej ned"],
      aiFix: "Tæl 3 sek på vej ned næste gang.",
      aiDraftedReply:
        "Flot pause-bench, Maria — solid pause. Du falder lidt for hurtigt ned; tæl tre.",
    },
    new Date(now.getTime() - 1000 * 60 * 60 * 2),
  );

  return [pending, extraPending2, extraPending, reviewed];
}
