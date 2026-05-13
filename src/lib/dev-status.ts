/**
 * Developer dashboard aggregator. Pulls together env-presence
 * checks, a handful of DB counts, and computed expiry-severity
 * for every entry in integration-reminders. Consumed only by
 * the /coach/system page — all callers are server-side, coach-
 * gated, and read-only.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { STRIPE_ENABLED } from "@/lib/stripe";
import { REMINDERS, type Reminder } from "@/lib/integration-reminders";

export type Severity = "ok" | "info" | "warn" | "critical";

export type ServiceStatus = {
  id: string;
  name: string;
  configured: boolean;
  /** Short status note (mode, env, etc.). */
  notes?: string;
  /** Where to manage this service (Supabase dashboard, Stripe, etc.). */
  dashboardUrl?: string;
};

export type ReminderRow = Reminder & {
  daysUntilExpiry: number | null;
  severity: Severity;
};

export type DevStatus = {
  collectedAt: string;
  services: ServiceStatus[];
  database: {
    reachable: boolean;
    members: number;
    activeSubscriptions: number;
    sessionsThisWeek: number;
    pendingFormChecks: number;
    error?: string;
  };
  reminders: ReminderRow[];
};

/** Extracts the project-ref subdomain from a Supabase URL. */
function projectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const m = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

function stripeMode(): "test" | "live" | "unknown" {
  const k = process.env.STRIPE_SECRET_KEY ?? "";
  if (k.startsWith("sk_test_")) return "test";
  if (k.startsWith("sk_live_")) return "live";
  return "unknown";
}

function severityFromDays(days: number | null): Severity {
  if (days === null) return "info";
  if (days < 0) return "critical";
  if (days < 30) return "critical";
  if (days < 90) return "warn";
  return "ok";
}

export async function getDevStatus(): Promise<DevStatus> {
  const ref = projectRef();
  const supabaseDashboard = ref
    ? `https://supabase.com/dashboard/project/${ref}`
    : undefined;

  const services: ServiceStatus[] = [
    {
      id: "supabase",
      name: "Supabase",
      configured: SUPABASE_ENABLED,
      notes: ref ? `project ${ref}` : "demo mode",
      dashboardUrl: supabaseDashboard,
    },
    {
      id: "anthropic",
      name: "Anthropic (Claude)",
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      notes: process.env.ANTHROPIC_API_KEY
        ? "AI generator enabled (claude-sonnet-4-6)"
        : "rule-based fallback active",
      dashboardUrl: "https://console.anthropic.com/settings/keys",
    },
    {
      id: "stripe",
      name: "Stripe",
      configured: STRIPE_ENABLED,
      notes: STRIPE_ENABLED ? `${stripeMode()} mode` : "demo mode",
      dashboardUrl:
        stripeMode() === "test"
          ? "https://dashboard.stripe.com/test/apikeys"
          : "https://dashboard.stripe.com/apikeys",
    },
    {
      id: "resend",
      name: "Resend",
      configured: Boolean(process.env.RESEND_API_KEY),
      notes: process.env.RESEND_FROM_EMAIL ?? "no FROM configured",
      dashboardUrl: "https://resend.com/emails",
    },
    {
      id: "unsplash",
      name: "Unsplash (meal images)",
      configured: Boolean(process.env.UNSPLASH_ACCESS_KEY),
      notes: process.env.UNSPLASH_ACCESS_KEY
        ? "Meal cards include hero images"
        : "Typography-only meal cards",
      dashboardUrl: "https://unsplash.com/oauth/applications",
    },
    {
      id: "vapid",
      name: "Web Push (VAPID)",
      configured: Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY,
      ),
      notes: process.env.VAPID_SUBJECT,
    },
    {
      id: "google-oauth",
      name: "Google OAuth",
      configured: SUPABASE_ENABLED,
      notes: "configured in Supabase Auth → Providers",
      dashboardUrl: ref
        ? `${supabaseDashboard}/auth/providers`
        : undefined,
    },
    {
      id: "apple-oauth",
      name: "Apple Sign-in",
      configured: SUPABASE_ENABLED,
      notes: "JWT rotates every 6 months — see reminders below",
      dashboardUrl: ref
        ? `${supabaseDashboard}/auth/providers`
        : undefined,
    },
  ];

  // DB counts — all four queries fire in parallel, individual
  // failures don't poison the rest of the dashboard.
  let database: DevStatus["database"] = {
    reachable: false,
    members: 0,
    activeSubscriptions: 0,
    sessionsThisWeek: 0,
    pendingFormChecks: 0,
  };

  const supabase = await createClient();
  if (supabase) {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoIso = weekAgo.toISOString();

      const [m, s, sess, fc] = await Promise.all([
        supabase
          .from("members")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .in("status", ["active", "trialing", "past_due"]),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .gte("created_at", weekAgoIso),
        supabase
          .from("form_checks")
          .select("id", { count: "exact", head: true })
          .is("coach_reviewed_at", null),
      ]);

      database = {
        reachable: true,
        members: m.count ?? 0,
        activeSubscriptions: s.count ?? 0,
        sessionsThisWeek: sess.count ?? 0,
        pendingFormChecks: fc.count ?? 0,
      };
    } catch (err) {
      database.error = err instanceof Error ? err.message : String(err);
    }
  }

  const now = Date.now();
  const reminders: ReminderRow[] = REMINDERS.map((r) => {
    let days: number | null = null;
    if (r.expiresAt) {
      const diff = Date.parse(r.expiresAt) - now;
      days = Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    return {
      ...r,
      daysUntilExpiry: days,
      severity: severityFromDays(days),
    };
  })
    // Hard expirations sorted by soonest first; soft-rotation
    // (null expiresAt) entries trail at the end.
    .sort((a, b) => {
      if (a.daysUntilExpiry === null && b.daysUntilExpiry === null) return 0;
      if (a.daysUntilExpiry === null) return 1;
      if (b.daysUntilExpiry === null) return -1;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

  return {
    collectedAt: new Date().toISOString(),
    services,
    database,
    reminders,
  };
}
