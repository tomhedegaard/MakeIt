/**
 * Email — sent when a member completes onboarding. Welcomes them and
 * sets expectations for the first week (program assigned, what
 * happens next, where to find form-checks, who Mikael is).
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";

export type WelcomeEmailArgs = {
  to: string;
  handle: string;
  programName: string | null;  // e.g. "PR-Block" — null if no program assigned
  firstSessionLabel: string | null; // e.g. "Dag A — Squat" — null if no session
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

function renderHtml(args: WelcomeEmailArgs): string {
  const handle = esc(args.handle);
  const program = args.programName
    ? `<div style="background:#18181B;border:1px solid rgba(245,242,236,0.08);border-radius:10px;padding:16px 18px;margin:16px 0;">
         <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A8A6A0;">Dit program</div>
         <div style="font-size:18px;color:#F5F2EC;margin-top:6px;font-weight:600;">${esc(args.programName)}</div>
         ${args.firstSessionLabel ? `<div style="font-size:13px;color:#A8A6A0;margin-top:4px;">Første session: ${esc(args.firstSessionLabel)}</div>` : ""}
       </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>Velkommen til crewet — MakeIt // HQ</title>
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
            Velkommen til crewet
          </span>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <h1 style="margin:0;font-weight:900;font-size:30px;line-height:1.05;letter-spacing:-0.02em;color:#F5F2EC;">
            Hej @${handle}.
            <br>Du er inde.
          </h1>
        </td></tr>
        <tr><td>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#A8A6A0;">
            Tak fordi du valgte at være en del af MakeIt // HQ. Mit navn er
            <strong style="color:#F5F2EC;">Mikael Munk</strong> — head coach
            i crewet, og jeg gennemgår alle dine form-checks personligt.
            Skriv direkte til mig på denne mail (eller @Munk i feedet) hvis
            du har spørgsmål.
          </p>
          ${program}
          <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#A8A6A0;">
            Sådan kommer du i gang:
          </p>
          <ol style="margin:8px 0 16px 20px;padding:0;color:#A8A6A0;font-size:14px;line-height:1.8;">
            <li><strong style="color:#F5F2EC;">Tap "Start session"</strong> på Today-skærmen — programmet er allerede klar.</li>
            <li><strong style="color:#F5F2EC;">Log dine sæt</strong> som du går — vægt, reps, RPE.</li>
            <li><strong style="color:#F5F2EC;">Optag form-check</strong> hvis du er i tvivl om teknik. AI svarer på sekunder, jeg gennemgår selv inden for 24t.</li>
            <li><strong style="color:#F5F2EC;">Tjen Reps</strong> for hver session — byt dem til limited drops, custom-broderet straps, og 1:1 tid med mig.</li>
          </ol>
        </td></tr>
        <tr><td style="padding-top:8px;padding-bottom:32px;">
          <a href="${args.baseUrl}/dashboard" style="display:inline-block;background:#F5F2EC;color:#0A0A0B;padding:14px 28px;border-radius:999px;font-weight:500;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-family:'SF Mono',Menlo,Consolas,monospace;">
            Åbn Today →
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(245,242,236,0.08);padding-top:20px;">
          <p style="margin:0 0 6px;color:#56554F;font-size:11px;line-height:1.7;">
            Lad os løfte tungt sammen.
          </p>
          <p style="margin:12px 0 0;color:#56554F;font-size:11px;line-height:1.7;">
            MakeIt Danmark ApS · Engvej 169 · 2300 København S · <a href="https://www.nowmakeit.eu" style="color:#A8A6A0;">nowmakeit.eu</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(args: WelcomeEmailArgs): string {
  return [
    `Hej @${args.handle}.`,
    "",
    "Du er inde.",
    "",
    "Mit navn er Mikael Munk — head coach i crewet, og jeg gennemgår alle dine form-checks personligt.",
    "",
    args.programName ? `Dit program: ${args.programName}${args.firstSessionLabel ? ` (første session: ${args.firstSessionLabel})` : ""}` : "",
    "",
    "Sådan kommer du i gang:",
    "1. Tap \"Start session\" på Today-skærmen.",
    "2. Log dine sæt som du går.",
    "3. Optag form-check hvis du er i tvivl.",
    "4. Tjen Reps for hver session.",
    "",
    `Åbn: ${args.baseUrl}/dashboard`,
    "",
    "— Mikael",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendWelcomeEmail(args: WelcomeEmailArgs): Promise<SendResult> {
  return sendEmail({
    to: args.to,
    subject: `Velkommen til crewet, @${args.handle}`,
    html: renderHtml(args),
    text: renderText(args),
  });
}
