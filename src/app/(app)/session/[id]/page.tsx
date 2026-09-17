import type { Metadata, Viewport } from "next";
import { TODAY_SESSION } from "@/lib/workout";
import ThemeScope from "@/components/ui/ThemeScope";
import { COMPANY } from "@/lib/company";
import { notFound } from "next/navigation";
import SessionClient from "./SessionClient";
import SessionPreview from "./SessionPreview";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getFullSession } from "@/lib/data/session";
import { hydrateDemoSessionLibrary } from "@/lib/data/session-library";
import { getSession } from "@/lib/auth";
import {
  FORM_CHECK_LIMIT,
  type FormCheckQuota,
} from "@/lib/data/form-check-quota";
import { getFormCheckQuota } from "@/lib/data/form-check-quota-server";
import { getActiveAdaptationForSession } from "@/lib/data/adaptive";
import { applyAdaptationToSession } from "@/lib/adaptive/apply";
import { getTodaysReadinessNudge } from "@/lib/data/hrv";

// Nat: the live session stays dark inside the Kalk app (spec §2, §6).
export const viewport: Viewport = { themeColor: "#0A0A0B", colorScheme: "dark" };

// Overrides the (app) layout's appleWebApp wholesale (shallow merge).
export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: COMPANY.name },
};

// AppShell's immersive wrapper is not flex, so minh-dvh (not flex-1)
// keeps Kalk background from showing under short content.
function Nat({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="nat" className="minh-dvh">
      {children}
    </ThemeScope>
  );
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (SUPABASE_ENABLED) {
    const member = await getSession();
    if (!member) notFound();
    const session = await getFullSession(id, member.id);
    if (!session) notFound();

    // Scheduled (not-yet-started) sessions render the read-only
    // preview. The "Start session" button flips status to "active"
    // and revalidates — the next render falls through to
    // SessionClient automatically.
    if (session.status === "scheduled") {
      return (
        <Nat>
          <SessionPreview session={session} />
        </Nat>
      );
    }

    const [quota, readinessNudge, adaptation] = await Promise.all([
      getFormCheckQuota(member.id, member.tier),
      getTodaysReadinessNudge(member.id),
      getActiveAdaptationForSession(member.id, id),
    ]);
    // Apply the active adaptation server-side. SessionClient sees the
    // already-modified session shape (reduced top-set weight, optional
    // accessory sets, paused replacement) and renders the markers.
    const adaptedSession = applyAdaptationToSession(session, adaptation);
    return (
      <Nat>
        <SessionClient
          session={adaptedSession}
          formCheckQuota={quota}
          readinessNudge={readinessNudge}
          adaptation={adaptation}
        />
      </Nat>
    );
  }

  // Demo mode — only the static TODAY_SESSION resolves.
  // Hydrate library join (cues, muscles, bundled demo loop) the
  // connected path would have loaded via session_exercises.exercise_id.
  const session =
    id === TODAY_SESSION.id ? hydrateDemoSessionLibrary(TODAY_SESSION) : null;
  if (!session) notFound();
  if (session.status === "scheduled") {
    return (
      <Nat>
        <SessionPreview session={session} />
      </Nat>
    );
  }
  const quota: FormCheckQuota = {
    used: 0,
    limit: FORM_CHECK_LIMIT.Legend,
    remaining: FORM_CHECK_LIMIT.Legend,
    resetsAt: new Date().toISOString(),
    hasRemaining: true,
  };
  return (
    <Nat>
      <SessionClient
        session={session}
        formCheckQuota={quota}
        readinessNudge={null}
        adaptation={null}
      />
    </Nat>
  );
}
