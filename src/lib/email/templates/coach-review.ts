/**
 * Email template — sent when Mikael Munk reviews a member's form-check.
 * Inline CSS only (most clients strip <style>); safe HTML escaping
 * around all user/coach content to prevent injection through notes.
 *
 * Localized per recipient via `members.locale`.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import {
  emailFooterHtml,
  emailFooterPlain,
  emailTranslator,
  type EmailT,
} from "@/lib/email/footer";
import type { Locale } from "@/i18n/config";

export type CoachReviewEmailArgs = {
  to: string;
  memberHandle: string;
  exerciseName: string | null;
  coachNotes: string;
  aiScore: number | null;
  aiHeadline: string | null;
  baseUrl: string;
  locale: Locale;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(args: CoachReviewEmailArgs & { t: EmailT; tFooter: EmailT }): string {
  const { t, tFooter } = args;
  const exercise = args.exerciseName
    ? esc(args.exerciseName)
    : esc(t("fallbackExercise"));
  const handle = esc(args.memberHandle);
  const notes = esc(args.coachNotes).replace(/\n/g, "<br>");
  const aiBlock =
    args.aiHeadline && args.aiScore != null
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td style="background:#F2F2F0;border:1px solid #E1E1DE;border-radius:0;padding:16px 18px;">
              <div style="font-size:13px;font-weight:500;color:#2E4A3B;">
                ${esc(t("aiAssessment", { score: args.aiScore }))}
              </div>
              <div style="font-size:14px;color:#111111;margin-top:6px;line-height:1.4;">
                ${esc(args.aiHeadline)}
              </div>
            </td>
          </tr>
        </table>`
      : "";
  const ctaUrl = `${args.baseUrl}/profile#form-checks`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="dark light">
  <title>${esc(t("title"))}</title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;color:#111111;font-family:'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-weight:500;letter-spacing:-0.02em;font-size:14px;color:#111111;">
                MakeIt
                <span style="color:#696964;margin:0 6px;">//</span>
                HQ
              </span>
            </td>
          </tr>

          <!-- Eyebrow -->
          <tr>
            <td style="padding-bottom:8px;">
              <span style="font-size:13px;font-weight:500;color:#2E4A3B;">
                ${esc(t("eyebrow"))}
              </span>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-bottom:20px;">
              <h1 style="margin:0;font-weight:500;font-size:28px;line-height:1.1;letter-spacing:-0.02em;color:#111111;">
                ${esc(t("headline", { exercise }))}
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#5E5E59;">
                ${esc(t("greeting", { handle }))}
              </p>
            </td>
          </tr>

          <!-- Coach note callout -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">
                <tr>
                  <td style="background:#F2F2F0;border-left:2px solid #111111;padding:18px 20px;border-radius:0;">
                    <div style="font-size:12px;color:#5E5E59;margin-bottom:10px;">
                      ${esc(t("coachByline"))}
                    </div>
                    <div style="font-size:15px;line-height:1.6;color:#111111;">
                      ${notes}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${aiBlock}

          <!-- CTA -->
          <tr>
            <td style="padding-top:8px;padding-bottom:32px;">
              <a href="${ctaUrl}" style="display:inline-block;background:#111111;color:#FFFFFF;padding:15px 24px;border-radius:0;font-weight:500;text-decoration:none;font-size:15px;">
                ${esc(t("cta"))}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #E1E1DE;padding-top:20px;">
              <p style="margin:0 0 6px;color:#696964;font-size:12px;line-height:1.7;">
                ${esc(tFooter("coachReviewNote"))}
              </p>
              <p style="margin:12px 0 0;color:#696964;font-size:12px;line-height:1.7;">
                ${emailFooterHtml()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(args: CoachReviewEmailArgs & { t: EmailT }): string {
  const { t } = args;
  const exercise = args.exerciseName ?? t("fallbackExercise");
  const ai =
    args.aiHeadline && args.aiScore != null
      ? `\n${t("text.aiAssessment", { score: args.aiScore })}\n${args.aiHeadline}\n`
      : "";
  return [
    t("text.headline", { exercise }),
    "",
    t("text.greeting", { handle: args.memberHandle }),
    "",
    args.coachNotes,
    ai,
    "",
    t("text.open", { url: `${args.baseUrl}/profile#form-checks` }),
    "",
    t("text.signoff"),
    emailFooterPlain(),
  ].join("\n");
}

export async function sendCoachReviewEmail(
  args: CoachReviewEmailArgs,
): Promise<SendResult> {
  const t = emailTranslator(args.locale, "Email.coachReview");
  const tFooter = emailTranslator(args.locale, "Email.footer");
  const exercise = args.exerciseName ?? t("fallbackExercise");
  const subject = t("subject", { exercise });
  return sendEmail({
    to: args.to,
    subject,
    html: renderHtml({ ...args, t, tFooter }),
    text: renderText({ ...args, t }),
  });
}
