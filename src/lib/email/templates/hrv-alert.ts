/**
 * Email template — sent when Mikael Munk leaves a personal note on
 * a member's HRV reading (V2.3 alerting flow). Inline CSS only (most
 * clients strip <style>); safe HTML escaping around all coach content
 * to prevent injection through notes. The template's own copy stays
 * warm and neutral — Munk's free-form note is inlined verbatim and
 * is where any direct message lives (spec §10: no medical claims,
 * no diagnosis from the template itself).
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { emailFooterHtml, emailFooterPlain } from "@/lib/email/footer";

export type HrvAlertEmailArgs = {
  to: string;
  memberHandle: string;
  coachNotes: string;
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

function renderHtml(args: HrvAlertEmailArgs): string {
  const handle = esc(args.memberHandle);
  const notes = esc(args.coachNotes).replace(/\n/g, "<br>");
  const ctaUrl = `${args.baseUrl}/hrv`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="dark light">
  <title>En personlig besked fra Mikael Munk — MakeIt // HQ</title>
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
                En personlig besked
              </span>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-bottom:20px;">
              <h1 style="margin:0;font-weight:500;font-size:28px;line-height:1.1;letter-spacing:-0.02em;color:#111111;">
                Mikael Munk har skrevet til dig.
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#5E5E59;">
                Hej @${handle},
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
                      Mikael Munk · @Munk
                    </div>
                    <div style="font-size:15px;line-height:1.6;color:#111111;">
                      ${notes}
                    </div>
                    <div style="font-size:14px;line-height:1.6;color:#5E5E59;margin-top:16px;">
                      — Mikael Munk, MakeIt // HQ
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding-top:8px;padding-bottom:32px;">
              <a href="${ctaUrl}" style="display:inline-block;background:#111111;color:#FFFFFF;padding:15px 24px;border-radius:0;font-weight:500;text-decoration:none;font-size:15px;">
                Åbn din HRV →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #E1E1DE;padding-top:20px;">
              <p style="margin:0 0 6px;color:#696964;font-size:12px;line-height:1.7;">
                Svar gerne direkte på denne mail — den lander hos Mikael.
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

function renderText(args: HrvAlertEmailArgs): string {
  return [
    "Mikael Munk har skrevet til dig.",
    "",
    `Hej @${args.memberHandle},`,
    "",
    args.coachNotes,
    "",
    "— Mikael Munk, MakeIt // HQ",
    "",
    `Åbn din HRV: ${args.baseUrl}/hrv`,
    "",
    "— MakeIt // HQ",
    emailFooterPlain(),
  ].join("\n");
}

export async function sendHrvAlertEmail(
  args: HrvAlertEmailArgs
): Promise<SendResult> {
  return sendEmail({
    to: args.to,
    subject: "En personlig besked fra Mikael Munk",
    html: renderHtml(args),
    text: renderText(args),
  });
}
