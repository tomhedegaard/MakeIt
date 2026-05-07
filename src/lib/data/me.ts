import { createClient } from "@/lib/supabase/server";

const FORM_CHECK_BUCKET = "form-check-videos";

export type MyFormCheck = {
  id: string;
  exerciseName: string | null;
  aiScore: number | null;
  aiHeadline: string | null;
  aiPos: string[];
  aiNeg: string[];
  aiFix: string | null;
  reviewedAt: string | null;
  coachNotes: string | null;
  videoUrl: string | null;
  createdAt: string;
};

const MOCK_MY_FORM_CHECKS: MyFormCheck[] = [
  {
    id: "fc-mock-1",
    exerciseName: "Back Squat",
    aiScore: 84,
    aiHeadline: "Solid sæt — let knæ-valgus i hullet",
    aiPos: ["Bardepth ramt på alle 3 reps", "Konsistent bar-path", "God spinal kontrol"],
    aiNeg: ["Højre knæ kollapser let indad på rep 2 og 3"],
    aiFix:
      'Driv knæene aktivt udad i bunden ("spread the floor"). Hold 1 sek pause i bunden næste sæt.',
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    coachNotes:
      "Enig med AI'en. Næste session: pause-squat med 80%. Filmer du fra siden i stedet for forfra? — Mikael",
    videoUrl: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "fc-mock-2",
    exerciseName: "Conventional Deadlift",
    aiScore: 79,
    aiHeadline: "Stærkt løft — hyperekstension på toppen",
    aiPos: ["Bar holder kontakt", "Lats engageret"],
    aiNeg: ["Hyperekstension i lock-out"],
    aiFix: 'Lås ud med squeeze i baller, ikke ved at læne tilbage.',
    reviewedAt: null,
    coachNotes: null,
    videoUrl: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
  },
];

/**
 * Form-checks for the authenticated member, with coach notes when
 * reviewed. Sorted: unreviewed first, then most recently reviewed.
 * Returns rich mock data in demo mode so /profile is demonstrable
 * without a backend.
 */
export async function getMyFormChecks(
  memberId: string,
  limit = 10
): Promise<MyFormCheck[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_MY_FORM_CHECKS;

  const { data } = await supabase
    .from("form_checks")
    .select(
      `
      id, exercise_name, ai_score, ai_headline, ai_pos, ai_neg, ai_fix,
      video_url, created_at,
      coach_reviewed_at, coach_notes
    `
    )
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Sort: unreviewed first, then most recently reviewed.
  data.sort((a, b) => {
    const aRev = a.coach_reviewed_at;
    const bRev = b.coach_reviewed_at;
    if (aRev == null && bRev != null) return -1;
    if (aRev != null && bRev == null) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Sign storage paths.
  const paths = data
    .map((f) => f.video_url)
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    try {
      const { data: signed } = await supabase.storage
        .from(FORM_CHECK_BUCKET)
        .createSignedUrls(paths, 3600);
      if (signed) {
        for (const item of signed) {
          if (item.path && item.signedUrl) {
            signedByPath.set(item.path, item.signedUrl);
          }
        }
      }
    } catch {
      // skip — videos won't render but the verdict still does
    }
  }

  return data.map((f) => ({
    id: f.id,
    exerciseName: f.exercise_name,
    aiScore: f.ai_score,
    aiHeadline: f.ai_headline,
    aiPos: Array.isArray(f.ai_pos) ? (f.ai_pos as string[]) : [],
    aiNeg: Array.isArray(f.ai_neg) ? (f.ai_neg as string[]) : [],
    aiFix: f.ai_fix,
    reviewedAt: f.coach_reviewed_at,
    coachNotes: f.coach_notes,
    videoUrl: f.video_url ? signedByPath.get(f.video_url) ?? null : null,
    createdAt: f.created_at,
  }));
}

export function pendingReviewCount(checks: MyFormCheck[]): number {
  return checks.filter((c) => c.coachNotes && c.reviewedAt).length;
}
