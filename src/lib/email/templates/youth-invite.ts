/**
 * E-mail to a young member (15–17) whose guardian has invited them to
 * MakeIt Ung (spec 2026-09-27-makeit-ung-design.md, afsnit 2).
 * Nord lys, like every other template.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { emailFooterHtml } from "@/lib/email/footer";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const SANS = "'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif";

export async function sendYouthInviteEmail(args: {
  to: string;
  firstName: string;
  guardianName: string;
  url: string;
  expiresDa: string;
}): Promise<SendResult> {
  const first = esc(args.firstName);
  const guardian = esc(args.guardianName);
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Du er inviteret til MakeIt Ung</title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;color:#111111;font-family:${SANS};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-weight:500;font-size:14px;color:#111111;">MakeIt <span style="color:#696964;margin:0 6px;">//</span> Ung</span>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <span style="font-size:13px;font-weight:500;color:#2E4A3B;">Invitation</span>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <h1 style="margin:0;font-weight:500;font-size:26px;line-height:1.1;color:#111111;">Hej ${first}. ${guardian} har inviteret dig.</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#333333;">
            MakeIt Ung er styrketræning for 15–17-årige: programmer, teknik og restitution.
            Før du opretter din konto, kan du se præcis hvad din forælder har sagt ja til,
            og hvornår din forælder får besked. Du giver selv dit samtykke.
          </p>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          <a href="${args.url}" style="display:inline-block;background:#111111;color:#FFFFFF;padding:15px 24px;border-radius:0;font-weight:500;text-decoration:none;font-size:15px;">Se invitationen</a>
          <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#5E5E59;">Linket virker til ${esc(args.expiresDa)}.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #E1E1DE;padding-top:20px;">
          <p style="margin:0 0 6px;color:#696964;font-size:12px;line-height:1.7;">
            Har du ikke bedt om det, kan du se bort fra mailen. Der oprettes ingen konto, før du selv gør det.
          </p>
          <p style="margin:12px 0 0;color:#696964;font-size:12px;line-height:1.7;">${emailFooterHtml()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = [
    `Hej ${args.firstName}. ${args.guardianName} har inviteret dig til MakeIt Ung.`,
    "",
    "Før du opretter din konto, kan du se hvad din forælder har sagt ja til, og hvornår din forælder får besked. Du giver selv dit samtykke.",
    "",
    `Se invitationen: ${args.url}`,
    `Linket virker til ${args.expiresDa}.`,
  ].join("\n");
  return sendEmail({ to: args.to, subject: `${args.guardianName} har inviteret dig til MakeIt Ung`, html, text });
}
