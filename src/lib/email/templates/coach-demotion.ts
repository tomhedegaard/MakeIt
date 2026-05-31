/**
 * Email — CC-8 quality cron notification on demotion.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Two recipients per demotion:
 *   - The demoted co-coach: "you're back in sandbox, here's what
 *     dropped, here's the path back to live."
 *   - Munk: "X was demoted, here's the score that triggered it."
 *
 * Both are intentionally short, plain, and Danish-only in v0. The
 * existing send-templates use HTML tables + the brand footer; we
 * mirror that shape minimally so the emails feel like the rest of
 * the MakeIt outbound mail, but without the full per-row styling
 * complexity — the message is one paragraph and one stat line.
 *
 * Demo / no-Resend-key mode: sendEmail silently no-ops (see resend.ts),
 * so the cron still completes its DB writes when Resend is offline.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { emailFooterHtml } from "@/lib/email/footer";

const ACCENT = "#F5F2EC";
const DIM = "#A8A6A0";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pct(n: number | null): string {
  return n === null ? "—" : `${Math.round(n * 100)}%`;
}

interface DemotionMailBaseArgs {
  handle: string;
  rollingAgreement: number | null;
  reviewSampleSize: number;
  agreementFloor: number;
  baseUrl: string;
}

/** To the demoted co-coach: low-key, factual, gives them the path back. */
export async function sendDemotionEmailToCoach(
  args: DemotionMailBaseArgs & { toEmail: string },
): Promise<SendResult> {
  const floorPct = `${Math.round(args.agreementFloor * 100)}%`;
  const score = pct(args.rollingAgreement);
  const subject = "Du er flyttet tilbage til sandbox-coaching";
  const html = `<!doctype html><html><body style="background:#0E0E0C;color:${ACCENT};font-family:-apple-system,system-ui,sans-serif;padding:24px;">
    <div style="max-width:560px;margin:0 auto;">
      <h1 style="font-size:20px;margin:0 0 16px;font-weight:600;">Hej @${esc(args.handle)} —</h1>
      <p style="font-size:14px;line-height:1.6;color:${ACCENT};">
        Din rolling agreement-score med Munk faldt under tærsklen denne uge, så vi har flyttet dig tilbage til sandbox-coaching.
      </p>
      <p style="font-size:14px;line-height:1.6;color:${DIM};">
        <strong style="color:${ACCENT};">${score}</strong> over de seneste ${args.reviewSampleSize} sandbox-reviews · live-grænse: <strong style="color:${ACCENT};">${floorPct}</strong>.
      </p>
      <p style="font-size:14px;line-height:1.6;color:${ACCENT};">
        Ingen sag — fortsæt med at lave sandbox-reviews. Når din score igen rammer grænsen over 50 reviews, kan Munk promote dig til live igen fra /coach/co-coaches.
      </p>
      <p style="font-size:13px;line-height:1.5;color:${DIM};margin-top:24px;">
        <a href="${args.baseUrl}/coach-school/sandbox" style="color:${ACCENT};">Åbn sandbox →</a>
      </p>
      <p style="font-size:11px;line-height:1.5;color:${DIM};margin-top:24px;">${emailFooterHtml()}</p>
    </div>
  </body></html>`;
  const text = [
    `Hej @${args.handle} —`,
    "",
    "Din rolling agreement-score med Munk faldt under tærsklen denne uge, så vi har flyttet dig tilbage til sandbox-coaching.",
    "",
    `${score} over de seneste ${args.reviewSampleSize} sandbox-reviews · live-grænse: ${floorPct}.`,
    "",
    "Ingen sag — fortsæt med at lave sandbox-reviews. Når din score igen rammer grænsen over 50 reviews, kan Munk promote dig til live igen.",
    "",
    `Åbn sandbox: ${args.baseUrl}/coach-school/sandbox`,
  ].join("\n");
  return sendEmail({ to: args.toEmail, subject, html, text });
}

/** To Munk: stat-first, short — the cron already logs the full payload. */
export async function sendDemotionEmailToMunk(
  args: DemotionMailBaseArgs & {
    toEmail: string;
    assignmentsEnded: number;
  },
): Promise<SendResult> {
  const floorPct = `${Math.round(args.agreementFloor * 100)}%`;
  const score = pct(args.rollingAgreement);
  const subject = `Co-coach demotion · @${args.handle}`;
  const html = `<!doctype html><html><body style="background:#0E0E0C;color:${ACCENT};font-family:-apple-system,system-ui,sans-serif;padding:24px;">
    <div style="max-width:560px;margin:0 auto;">
      <h1 style="font-size:20px;margin:0 0 16px;font-weight:600;">Co-coach demotion · @${esc(args.handle)}</h1>
      <p style="font-size:14px;line-height:1.6;color:${ACCENT};">
        Quality-cron flyttede <strong>@${esc(args.handle)}</strong> tilbage til <code>beast_sandbox</code> denne uge.
      </p>
      <table role="presentation" style="margin:16px 0;font-size:13px;color:${DIM};border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;">Agreement (last ${args.reviewSampleSize}):</td><td style="color:${ACCENT};"><strong>${score}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;">Demote floor:</td><td style="color:${ACCENT};">${floorPct}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;">Assignments ended:</td><td style="color:${ACCENT};">${args.assignmentsEnded}</td></tr>
      </table>
      <p style="font-size:13px;line-height:1.5;color:${DIM};margin-top:24px;">
        <a href="${args.baseUrl}/coach/co-coaches" style="color:${ACCENT};">Åbn /coach/co-coaches →</a>
      </p>
      <p style="font-size:11px;line-height:1.5;color:${DIM};margin-top:24px;">${emailFooterHtml()}</p>
    </div>
  </body></html>`;
  const text = [
    `Co-coach demotion · @${args.handle}`,
    "",
    `Quality-cron flyttede @${args.handle} tilbage til beast_sandbox.`,
    "",
    `Agreement (last ${args.reviewSampleSize}): ${score}`,
    `Demote floor: ${floorPct}`,
    `Assignments ended: ${args.assignmentsEnded}`,
    "",
    `Åbn: ${args.baseUrl}/coach/co-coaches`,
  ].join("\n");
  return sendEmail({ to: args.toEmail, subject, html, text });
}
