/**
 * Static configuration for credentials / artifacts that need
 * periodic attention. Each entry powers a row in the developer
 * dashboard at /coach/system.
 *
 * For credentials WITHOUT a hard expiry (Stripe secret, Resend
 * API key, etc.), use `expiresAt: null` + `suggestedRotation`
 * to surface a soft reminder.
 *
 * After rotating a credential, update the `expiresAt` here (or
 * leave it as-is for soft-rotation entries — the dashboard
 * shows last-rotation context via the suggestedRotation copy).
 */

export type Reminder = {
  /** Stable identifier — used as React key + audit reference. */
  id: string;
  label: string;
  service: string;
  /** ISO date — null = no hard expiry, rotate at suggestedRotation cadence. */
  expiresAt: string | null;
  /** Human copy for soft rotation cadence (e.g. "annually"). */
  suggestedRotation?: string;
  /** Short runbook for rotation — what command + where to paste. */
  runbook: string;
};

export const REMINDERS: Reminder[] = [
  {
    id: "apple-jwt",
    label: "Apple Sign-in client_secret JWT",
    service: "Apple OAuth",
    // Apple caps client_secret JWT lifetime at 6 months; generated
    // 2026-05-10, expires 2026-11-06. Update after running
    // `npm run apple:jwt` and pasting the new JWT into Supabase.
    expiresAt: "2026-11-06T16:57:08Z",
    runbook:
      "npm run apple:jwt → paste output into Supabase Dashboard → Auth → Providers → Apple → Secret Key (for OAuth)",
  },
  {
    id: "stripe-webhook-prod",
    label: "Stripe webhook signing secret (prod)",
    service: "Stripe",
    expiresAt: null,
    suggestedRotation: "Rotate annually or after any team-member departure",
    runbook:
      "Stripe Dashboard → Developers → Webhooks → your prod endpoint → Roll signing secret → update STRIPE_WEBHOOK_SECRET in Vercel env",
  },
  {
    id: "supabase-db-password",
    label: "Supabase DB password",
    service: "Supabase",
    expiresAt: null,
    suggestedRotation: "Rotate annually",
    runbook:
      "Supabase Dashboard → Settings → Database → Reset database password → re-link CLI with `supabase link --project-ref <ref>`",
  },
  {
    id: "supabase-service-role",
    label: "Supabase service_role key",
    service: "Supabase",
    expiresAt: null,
    suggestedRotation: "Rotate annually",
    runbook:
      "Supabase Dashboard → Settings → API → Reset service_role key → update SUPABASE_SERVICE_ROLE_KEY in Vercel env",
  },
];
