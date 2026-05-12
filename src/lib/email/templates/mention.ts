/**
 * Email — sent when a member is @mentioned in a post comment.
 * Same dark-on-brand style as coach-review template.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { emailFooterHtml } from "@/lib/email/footer";

export type MentionEmailArgs = {
  to: string;
  recipientHandle: string;
  authorHandle: string;
  authorTier: string | null;
  commentContent: string;
  postContext: string | null;  // first ~120 chars of the post body
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

function renderHtml(args: MentionEmailArgs): string {
  const author = esc(args.authorHandle);
  const recipient = esc(args.recipientHandle);
  const comment = esc(args.commentContent).replace(/\n/g, "<br>");
  const postCtx = args.postContext
    ? `<div style="font-size:13px;color:#A8A6A0;font-style:italic;border-left:1px solid rgba(245,242,236,0.18);padding:6px 12px;margin-bottom:12px;">${esc(args.postContext)}</div>`
    : "";
  const ctaUrl = `${args.baseUrl}/community`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>Du blev nævnt — MakeIt // HQ</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0B;color:#F5F2EC;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-weight:900;letter-spacing:-0.02em;text-transform:uppercase;font-size:14px;color:#F5F2EC;">
            MAKEIT <span style="color:#56554F;margin:0 6px;">//</span> HQ
          </span>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A8A6A0;">
            Du blev nævnt
          </span>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <h1 style="margin:0;font-weight:900;font-size:26px;line-height:1.1;letter-spacing:-0.02em;color:#F5F2EC;">
            @${author} nævnte dig i en kommentar.
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#A8A6A0;">
            Hej @${recipient} — her er hvad de skrev:
          </p>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">
            <tr><td style="background:#18181B;border-left:2px solid #F5F2EC;padding:18px 20px;border-radius:0 6px 6px 0;">
              ${postCtx}
              <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#A8A6A0;margin-bottom:10px;">
                @${author}
              </div>
              <div style="font-size:15px;line-height:1.6;color:#F5F2EC;">${comment}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding-top:16px;padding-bottom:32px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#F5F2EC;color:#0A0A0B;padding:14px 28px;border-radius:999px;font-weight:500;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-family:'SF Mono',Menlo,Consolas,monospace;">
            Svar i feedet →
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(245,242,236,0.08);padding-top:20px;">
          <p style="margin:0 0 6px;color:#56554F;font-size:11px;line-height:1.7;">
            Du modtager kun denne mail når et crew-medlem har skrevet @${recipient}.
            Slå mention-mails fra i indstillinger på din profil hvis det bliver for meget.
          </p>
          <p style="margin:12px 0 0;color:#56554F;font-size:11px;line-height:1.7;">
            ${emailFooterHtml()}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(args: MentionEmailArgs): string {
  return [
    `@${args.authorHandle} nævnte dig i en kommentar.`,
    "",
    args.postContext ? `Posten:\n${args.postContext}` : "",
    "",
    `Kommentar:\n${args.commentContent}`,
    "",
    `Åbn: ${args.baseUrl}/community`,
    "",
    "— MakeIt // HQ",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendMentionEmail(args: MentionEmailArgs): Promise<SendResult> {
  return sendEmail({
    to: args.to,
    subject: `@${args.authorHandle} nævnte dig i en kommentar`,
    html: renderHtml(args),
    text: renderText(args),
  });
}
