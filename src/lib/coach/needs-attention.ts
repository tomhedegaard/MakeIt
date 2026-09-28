/**
 * Coach Needs Attention strip — three buckets, athlete + lift language.
 *
 * Coach-only. No compliance %, no churn %, no gym-SaaS scale theater.
 * Deep-links stay on existing /coach/members and /coach/queue homes.
 */

import {
  liftLabel,
  pendingFormQueue,
  type FormQueueItem,
} from "@/lib/form-queue/queue";

export type NeedsBucketId = "sprunget" | "afventer_form" | "engine";

export type NeedsRow = {
  id: string;
  bucket: NeedsBucketId;
  memberId: string;
  memberHandle: string;
  lift: string | null;
  detail: string;
  href: string;
};

export type NeedsAttentionModel = {
  sprunget: NeedsRow[];
  afventerForm: NeedsRow[];
  engine: NeedsRow[];
};

export type NeedsAttentionInput = {
  skipped: Array<{
    id: string;
    memberId: string;
    memberHandle: string;
    lift?: string | null;
    detail: string;
  }>;
  pendingForm: Array<
    Pick<FormQueueItem, "id" | "memberId" | "memberHandle" | "exerciseName"> & {
      setIndex?: number | null;
    }
  >;
  engineFlags: Array<{
    id: string;
    memberId: string;
    memberHandle: string;
    lift?: string | null;
    detail: string;
    href?: string;
  }>;
};

export function buildNeedsAttention(
  input: NeedsAttentionInput,
): NeedsAttentionModel {
  const sprunget: NeedsRow[] = input.skipped.map((row) => ({
    id: row.id,
    bucket: "sprunget",
    memberId: row.memberId,
    memberHandle: row.memberHandle,
    lift: row.lift ?? null,
    detail: row.detail,
    href: `/coach/members/${row.memberId}`,
  }));

  const afventerForm: NeedsRow[] = pendingFormQueue(
    input.pendingForm.map((row) => ({
      id: row.id,
      type: "form_check",
      memberId: row.memberId,
      memberHandle: row.memberHandle,
      exerciseName: row.exerciseName ?? "Form-check",
      setIndex: row.setIndex ?? 0,
      sessionId: null,
      status: "pending",
      reviewedAt: null,
      reviewedBy: null,
      coachNotes: null,
      voiceNoteUrl: null,
      voiceNoteDurationSec: null,
      aiScore: null,
      aiHeadline: null,
      aiPos: [],
      aiNeg: [],
      aiFix: null,
      aiDraftedReply: null,
      videoUrl: null,
      createdAt: "",
    })),
  ).map((row) => ({
    id: row.id,
    bucket: "afventer_form" as const,
    memberId: row.memberId,
    memberHandle: row.memberHandle,
    lift: liftLabel(row),
    detail: liftLabel(row),
    href: `/coach/queue#form-${row.id}`,
  }));

  const engine: NeedsRow[] = input.engineFlags.map((row) => ({
    id: row.id,
    bucket: "engine",
    memberId: row.memberId,
    memberHandle: row.memberHandle,
    lift: row.lift ?? null,
    detail: row.detail,
    href: row.href ?? `/coach/queue#engine-${row.id}`,
  }));

  return { sprunget, afventerForm, engine };
}

/**
 * Curated demo synthetics — not derived from stale mock session dates
 * (those sit in May and would empty or flood every bucket).
 */
export function demoNeedsAttention(): NeedsAttentionModel {
  return buildNeedsAttention({
    skipped: [
      {
        id: "skip-anders",
        memberId: "m-anders",
        memberHandle: "anders",
        lift: null,
        detail: "intet pas logged",
      },
      {
        id: "skip-oliver",
        memberId: "m-oliver",
        memberHandle: "oliver",
        lift: "Squat",
        detail: "sprang Dag A — Squat",
      },
    ],
    pendingForm: [
      {
        id: "fc-nina-dl",
        memberId: "m-nina",
        memberHandle: "nina_dl",
        exerciseName: "Conventional Deadlift",
        setIndex: 2,
      },
      {
        id: "fc-kasper-sq",
        memberId: "m-kasper",
        memberHandle: "kasper_s",
        exerciseName: "Back Squat",
        setIndex: 3,
      },
      {
        id: "fc-maria-bp",
        memberId: "m-maria",
        memberHandle: "maria.lift",
        exerciseName: "Paused Bench",
        setIndex: 1,
      },
    ],
    engineFlags: [
      {
        id: "eng-nina",
        memberId: "m-nina",
        memberHandle: "nina_dl",
        lift: "Deadlift",
        detail: "træthed · HRV under bånd",
        href: "/coach/queue#engine-eng-nina",
      },
      {
        id: "eng-kasper",
        memberId: "m-kasper",
        memberHandle: "kasper_s",
        lift: "Back Squat",
        detail: "stall · RPE-drift",
        href: "/coach/queue#engine-eng-kasper",
      },
    ],
  });
}

export function bucketCounts(model: NeedsAttentionModel): {
  sprunget: number;
  afventerForm: number;
  engine: number;
} {
  return {
    sprunget: model.sprunget.length,
    afventerForm: model.afventerForm.length,
    engine: model.engine.length,
  };
}
