/**
 * Email template — sent when Mikael Munk reviews a member's form-check.
 * Inline CSS only (most clients strip <style>); safe HTML escaping
 * around all user/coach content to prevent injection through notes.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { emailFooterHtml, emailFooterPlain } from "@/lib/email/footer";

export type CoachReviewEmailArgs = {
  to: string;
  memberHandle: string;
  exerciseName: string | null;
  coachNotes: string;
  aiScore: number | null;
  aiHeadline: string | null;
  baseUrl: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(args: CoachReviewEmailArgs): string {
  const exercise = args.exerciseName ? esc(args.exerciseName) : "form-check";
  const handle = esc(args.memberHandle);
  const notes = esc(args.coachNotes).replace(/\n/g, "<br>");
  const aiBlock =
    args.aiHeadline && args.aiScore != null
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td style="background:#18181B;border:1px solid rgba(245,242,236,0.08);border-radius:10px;padding:16px 18px;">
              <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A8A6A0;">
                AI-vurdering · ${args.aiScore}/100
              </div>
              <div style="font-size:14px;color:#F5F2EC;margin-top:6px;line-height:1.4;">
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
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>Form-check besvaret — MakeIt // HQ</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0B;color:#F5F2EC;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-weight:900;letter-spacing:-0.02em;text-transform:uppercase;font-size:14px;color:#F5F2EC;">
                MAKEIT
                <span style="color:#56554F;margin:0 6px;">//</span>
                HQ
              </span>
            </td>
          </tr>

          <!-- Eyebrow -->
          <tr>
            <td style="padding-bottom:8px;">
              <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A8A6A0;">
                Form-check besvaret
              </span>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-bottom:20px;">
              <h1 style="margin:0;font-weight:900;font-size:28px;line-height:1.1;letter-spacing:-0.02em;color:#F5F2EC;">
                Mikael Munk har gennemgået din ${exercise}.
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#A8A6A0;">
                Hej @${handle} — her er hans note:
              </p>
            </td>
          </tr>

          <!-- Coach note callout -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">
                <tr>
                  <td style="background:#18181B;border-left:2px solid #F5F2EC;padding:18px 20px;border-radius:0 6px 6px 0;">
                    <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#A8A6A0;margin-bottom:10px;">
                      Mikael Munk · @Munk
                    </div>
                    <div style="font-size:15px;line-height:1.6;color:#F5F2EC;">
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
              <a href="${ctaUrl}" style="display:inline-block;background:#F5F2EC;color:#0A0A0B;padding:14px 28px;border-radius:999px;font-weight:500;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-family:'SF Mono',Menlo,Consolas,monospace;">
                Åbn på MakeIt // HQ →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(245,242,236,0.08);padding-top:20px;">
              <p style="margin:0 0 6px;color:#56554F;font-size:11px;line-height:1.7;">
                Coach-noter sendes typisk inden for 24 timer efter du uploader en form-check.
                Svar gerne direkte på denne mail — den lander hos Mikael.
              </p>
              <p style="margin:12px 0 0;color:#56554F;font-size:11px;line-height:1.7;">
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

function renderText(args: CoachReviewEmailArgs): string {
  const exercise = args.exerciseName ?? "form-check";
  const ai =
    args.aiHeadline && args.aiScore != null
      ? `\nAI-vurdering · ${args.aiScore}/100\n${args.aiHeadline}\n`
      : "";
  return [
    `Mikael Munk har gennemgået din ${exercise}.`,
    "",
    `Hej @${args.memberHandle} — her er hans note:`,
    "",
    args.coachNotes,
    ai,
    "",
    `Åbn: ${args.baseUrl}/profile#form-checks`,
    "",
    "— MakeIt // HQ",
    emailFooterPlain(),
  ].join("\n");
}

export async function sendCoachReviewEmail(
  args: CoachReviewEmailArgs
): Promise<SendResult> {
  const subject = `Mikael Munk har besvaret din ${args.exerciseName ?? "form-check"}`;
  return sendEmail({
    to: args.to,
    subject,
    html: renderHtml(args),
    text: renderText(args),
  });
}
