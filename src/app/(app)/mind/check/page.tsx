import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getRecentMindCheckLogs,
  getTodayMindCheck,
  hasAcknowledgedMentalDisclaimer,
} from "@/lib/data/mind";
import MindCheckForm from "@/components/mind/MindCheckForm";
import MentalGraph from "@/components/mind/MentalGraph";
import StreakBadge from "@/components/mind/StreakBadge";
import MindFirstTimeTour from "@/components/mind/MindFirstTimeTour";
import MindCelebration from "@/components/mind/MindCelebration";
import { currentStreak, longestStreak } from "@/lib/mind/streak";

export async function generateMetadata() {
  const t = await getTranslations("Mind.check");
  return { title: t("metaTitle") };
}

/**
 * `/mind/check` — the daily 60-second mental signal surface.
 *
 * MH-2: 3 sliders + optional note, 30-day mental graph, streak badge.
 * Adaptive Engine integration (mental signal → readiness) lands in MH-6.
 */
export default async function MindCheckPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const t = await getTranslations("Mind.check");
  const [logs, today] = await Promise.all([
    getRecentMindCheckLogs(member.id, 30),
    getTodayMindCheck(member.id),
  ]);

  const current = currentStreak(logs);
  const longest = longestStreak(logs);

  // Derive the milestone celebration kind. Renders only on the day a
  // milestone is crossed; localStorage per-kind keeps each one-shot.
  const celebrationKind = pickCelebration(logs.length, today, current);

  return (
    <>
      <MindFirstTimeTour />
      <PageHeader
        eyebrow={t("eyebrow")}
        title={today ? t("titleUpdate") : t("titleNew")}
        subtitle={today ? t("subtitleUpdate") : t("subtitleNew")}
        right={<StreakBadge current={current} longest={longest} />}
      />
      <Container size="narrow" className="py-10 md:py-14 space-y-10">
        {celebrationKind ? <MindCelebration kind={celebrationKind} /> : null}

        <MindCheckForm
          initial={
            today
              ? {
                  energy: today.energy,
                  stress: today.stress,
                  focus: today.focus,
                  note: today.note,
                }
              : null
          }
        />

        <div className="mt-6">
          <MentalGraph logs={logs} days={30} />
        </div>

      </Container>
    </>
  );
}

/**
 * Decide which celebration (if any) to render. Pure derivation from
 * inputs the page already has. Returns null when no milestone is
 * freshly crossed; the celebration's own localStorage flag is the
 * once-only guard for repeat visits.
 */
function pickCelebration(
  totalLogs: number,
  today: import("@/lib/mind/types").MindCheckLog | null,
  currentStreakDays: number,
): "first_check" | "streak_3" | "streak_7" | "streak_30" | "streak_90" | null {
  if (!today) return null;
  if (totalLogs <= 1) return "first_check";
  if (currentStreakDays >= 90) return "streak_90";
  if (currentStreakDays >= 30) return "streak_30";
  if (currentStreakDays >= 7) return "streak_7";
  if (currentStreakDays >= 3) return "streak_3";
  return null;
}
