/**
 * Email — sent when a member completes onboarding. Welcomes them and
 * sets expectations for the first week (program assigned, what
 * happens next, where to find form-checks, who Mikael is).
 *
 * Localized per recipient via `members.locale`.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import {
  emailFooterHtml,
  emailTranslator,
  type EmailT,
} from "@/lib/email/footer";
import type { Locale } from "@/i18n/config";

export type WelcomeEmailArgs = {
  to: string;
  handle: string;
  programName: string | null;  // e.g. "PR-Block" — null if no program assigned
  firstSessionLabel: string | null; // e.g. "Dag A — Squat" — null if no session
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

function renderHtml(args: WelcomeEmailArgs & { t: EmailT; tFooter: EmailT }): string {
  const { t, tFooter } = args;
  const handle = esc(args.handle);
  const program = args.programName
    ? `<div style="background:#18181B;border:1px solid rgba(245,242,236,0.08);border-radius:10px;padding:16px 18px;margin:16px 0;">
         <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A8A6A0;">${esc(t("programLabel"))}</div>
         <div style="font-size:18px;color:#F5F2EC;margin-top:6px;font-weight:600;">${esc(args.programName)}</div>
         ${args.firstSessionLabel ? `<div style="font-size:13px;color:#A8A6A0;margin-top:4px;">${esc(t("firstSession", { label: args.firstSessionLabel }))}</div>` : ""}
       </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>${esc(t("title"))}</title>
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
            ${esc(t("eyebrow"))}
          </span>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <h1 style="margin:0;font-weight:900;font-size:30px;line-height:1.05;letter-spacing:-0.02em;color:#F5F2EC;">
            ${esc(t("greeting", { handle }))}
            <br>${esc(t("youAreIn"))}
          </h1>
        </td></tr>
        <tr><td>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#A8A6A0;">
            ${t("intro").replaceAll("<strong>", '<strong style="color:#F5F2EC;">')}
          </p>
          ${program}
          <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#A8A6A0;">
            ${esc(t("getStarted"))}
          </p>
          <ol style="margin:8px 0 16px 20px;padding:0;color:#A8A6A0;font-size:14px;line-height:1.8;">
            <li><strong style="color:#F5F2EC;">${esc(t("steps.step1Strong"))}</strong> ${esc(t("steps.step1Rest"))}</li>
            <li><strong style="color:#F5F2EC;">${esc(t("steps.step2Strong"))}</strong> ${esc(t("steps.step2Rest"))}</li>
            <li><strong style="color:#F5F2EC;">${esc(t("steps.step3Strong"))}</strong> ${esc(t("steps.step3Rest"))}</li>
            <li><strong style="color:#F5F2EC;">${esc(t("steps.step4Strong"))}</strong> ${esc(t("steps.step4Rest"))}</li>
          </ol>
        </td></tr>
        <tr><td style="padding-top:8px;padding-bottom:32px;">
          <a href="${args.baseUrl}/dashboard" style="display:inline-block;background:#F5F2EC;color:#0A0A0B;padding:14px 28px;border-radius:999px;font-weight:500;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-family:'SF Mono',Menlo,Consolas,monospace;">
            ${esc(t("cta"))}
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(245,242,236,0.08);padding-top:20px;">
          <p style="margin:0 0 6px;color:#56554F;font-size:11px;line-height:1.7;">
            ${esc(tFooter("welcomeNote"))}
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

function renderText(args: WelcomeEmailArgs & { t: EmailT }): string {
  const { t } = args;
  const programLine = args.programName
    ? args.firstSessionLabel
      ? t("text.programWithFirst", {
          program: args.programName,
          firstSession: args.firstSessionLabel,
        })
      : t("text.programOnly", { program: args.programName })
    : "";
  return [
    t("greeting", { handle: args.handle }),
    "",
    t("youAreIn"),
    "",
    t("text.intro"),
    "",
    programLine,
    "",
    t("text.getStarted"),
    t("text.step1"),
    t("text.step2"),
    t("text.step3"),
    t("text.step4"),
    "",
    t("text.open", { url: `${args.baseUrl}/dashboard` }),
    "",
    t("text.signoff"),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendWelcomeEmail(args: WelcomeEmailArgs): Promise<SendResult> {
  const t = emailTranslator(args.locale, "Email.welcome");
  const tFooter = emailTranslator(args.locale, "Email.footer");
  return sendEmail({
    to: args.to,
    subject: t("subject", { handle: args.handle }),
    html: renderHtml({ ...args, t, tFooter }),
    text: renderText({ ...args, t }),
  });
}
