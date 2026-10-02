/**
 * E-mail to a guardian when MakeIt Ung sees a sign (spec
 * 2026-09-27-makeit-ung-design.md, afsnit 5). The body is the same
 * observational sentence the young member sees in the app, never a
 * diagnosis and never anything the young member wrote. Nord lys.
 */
import "server-only";
import { COMPANY } from "@/lib/company";
import type { Locale } from "@/i18n/config";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { emailFooterHtml, emailFooterPlain, emailTranslator } from "@/lib/email/footer";
import { levelOf, noticeValues, type NoticeSignal, type SignalDetail } from "@/lib/youth/signals";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const SANS = "'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif";

export async function sendYouthNoticeEmail(args: {
  to: string;
  locale: Locale;
  youthName: string;
  signal: NoticeSignal;
  detail: SignalDetail;
}): Promise<SendResult> {
  const t = emailTranslator(args.locale, "Youth.notices");
  const acute = levelOf(args.signal) === "acute";
  const values = noticeValues(args.detail, args.youthName);
  const url = `${COMPANY.appUrl}/ung`;
  const eyebrow = t(acute ? "eyebrowAcute" : "eyebrowConcern");
  const observed = t(args.signal, values);
  const next = t(acute ? "acuteNext" : "concernNext", values);
  const seen = t("seenByYouth", values);
  const why = t("why", { name: args.youthName, url });
  const subject = t(acute ? "subjectAcute" : "subjectConcern", values);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;color:#111111;font-family:${SANS};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-weight:500;font-size:14px;color:#111111;">MakeIt <span style="color:#696964;margin:0 6px;">//</span> Ung</span>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <span style="font-size:13px;font-weight:500;color:#2E4A3B;">${esc(eyebrow)}</span>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <h1 style="margin:0;font-weight:500;font-size:22px;line-height:1.3;color:#111111;">${esc(observed)}</h1>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#333333;">${esc(next)}</p>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#333333;">${esc(seen)}</p>
        </td></tr>
        <tr><td style="border-top:1px solid #E1E1DE;padding-top:20px;">
          <p style="margin:0 0 6px;color:#696964;font-size:12px;line-height:1.7;">${esc(why)}</p>
          <p style="margin:12px 0 0;color:#696964;font-size:12px;line-height:1.7;">${emailFooterHtml()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = [observed, "", next, "", seen, "", why, "", emailFooterPlain()].join("\n");
  return sendEmail({ to: args.to, subject, html, text });
}
