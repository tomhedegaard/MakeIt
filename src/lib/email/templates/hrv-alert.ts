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
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>En personlig besked fra Mikael Munk — MakeIt // HQ</title>
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
                En personlig besked
              </span>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-bottom:20px;">
              <h1 style="margin:0;font-weight:900;font-size:28px;line-height:1.1;letter-spacing:-0.02em;color:#F5F2EC;">
                Mikael Munk har skrevet til dig.
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#A8A6A0;">
                Hej @${handle},
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
                    <div style="font-size:14px;line-height:1.6;color:#A8A6A0;margin-top:16px;">
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
              <a href="${ctaUrl}" style="display:inline-block;background:#F5F2EC;color:#0A0A0B;padding:14px 28px;border-radius:999px;font-weight:500;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-family:'SF Mono',Menlo,Consolas,monospace;">
                Åbn din HRV →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(245,242,236,0.08);padding-top:20px;">
              <p style="margin:0 0 6px;color:#56554F;font-size:11px;line-height:1.7;">
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
