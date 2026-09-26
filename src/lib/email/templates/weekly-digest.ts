/**
 * Email — weekly crew digest. Sent by the coach to every member
 * with the past-week's totals + top posts + top posters.
 *
 * Localized per recipient. Locale comes from `members.locale` and
 * is passed in by the caller — we never read cookies here because
 * this can also fire from a cron with no request context.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import {
  dateLocaleTag,
  emailFooterHtml,
  emailTranslator,
  type EmailT,
} from "@/lib/email/footer";
import type { WeekDigest } from "@/lib/data/digest";
import type { Locale } from "@/i18n/config";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtRange(from: string, to: string, locale: Locale): string {
  const tag = dateLocaleTag(locale);
  const f = new Date(from + "T00:00:00").toLocaleDateString(tag, {
    day: "numeric",
    month: "short",
  });
  const t = new Date(to + "T00:00:00").toLocaleDateString(tag, {
    day: "numeric",
    month: "short",
  });
  return `${f} – ${t}`;
}

function renderHtml(args: {
  recipientHandle: string;
  digest: WeekDigest;
  baseUrl: string;
  locale: Locale;
  t: EmailT;
  tFooter: EmailT;
}): string {
  const { digest, t, tFooter, locale } = args;
  const range = fmtRange(digest.rangeFrom, digest.rangeTo, locale);

  const stats = [
    { label: t("stats.posts"), value: digest.totalPosts },
    { label: t("stats.prs"), value: digest.totalPRs },
    { label: t("stats.sessions"), value: digest.totalSessionsCompleted },
    { label: t("stats.formChecks"), value: digest.totalFormChecksReviewed },
    { label: t("stats.newMembers"), value: digest.newMembers },
  ];

  const statsCells = stats
    .map(
      (s) => `
      <td valign="top" style="padding:14px 8px;text-align:center;border-right:1px solid #E1E1DE;">
        <div style="font-variant-numeric:tabular-nums;font-size:24px;color:#111111;">${s.value}</div>
        <div style="font-size:12px;color:#5E5E59;margin-top:4px;">${esc(s.label)}</div>
      </td>`
    )
    .join("");

  const topPosts = digest.topPosts
    .map(
      (p, i) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid #E1E1DE;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:32px;font-variant-numeric:tabular-nums;color:#696964;font-size:12px;vertical-align:top;">${String(i + 1).padStart(2, "0")}</td>
            <td style="vertical-align:top;">
              <div style="font-size:13px;color:#111111;">${esc(p.who)}</div>
              <div style="font-size:13px;color:#5E5E59;line-height:1.5;margin-top:2px;">${esc(p.content)}</div>
            </td>
            <td style="font-variant-numeric:tabular-nums;color:#5E5E59;font-size:12px;vertical-align:top;text-align:right;white-space:nowrap;">+${p.reactions}</td>
          </tr>
        </table>
      </td></tr>`
    )
    .join("");

  const topPosters = digest.topPosters
    .map(
      (p) =>
        `<span style="display:inline-block;border:1px solid #CFCFCA;border-radius:0;padding:4px 10px;font-size:12px;color:#111111;margin-right:6px;margin-bottom:6px;">${esc(p.who)} · ${p.count}</span>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(t("title", { range }))}</title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;color:#111111;font-family:'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-weight:500;letter-spacing:-0.02em;font-size:14px;color:#111111;">
            MakeIt <span style="color:#696964;margin:0 6px;">//</span> HQ
          </span>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <span style="font-size:13px;font-weight:500;color:#2E4A3B;">
            ${esc(t("eyebrow", { range }))}
          </span>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <h1 style="margin:0;font-weight:500;font-size:30px;line-height:1.05;letter-spacing:-0.02em;color:#111111;">
            ${esc(t("greeting", { handle: args.recipientHandle }))}
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F0;border:1px solid #E1E1DE;border-radius:0;overflow:hidden;">
            <tr>${statsCells}</tr>
          </table>
        </td></tr>

        ${
          digest.topPosts.length > 0
            ? `<tr><td style="padding-bottom:24px;">
                 <div style="font-size:13px;font-weight:500;color:#2E4A3B;margin-bottom:8px;">${esc(t("topPosts"))}</div>
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${topPosts}</table>
               </td></tr>`
            : ""
        }

        ${
          digest.topPosters.length > 0
            ? `<tr><td style="padding-bottom:24px;">
                 <div style="font-size:13px;font-weight:500;color:#2E4A3B;margin-bottom:10px;">${esc(t("topPosters"))}</div>
                 <div>${topPosters}</div>
               </td></tr>`
            : ""
        }

        <tr><td style="padding-top:8px;padding-bottom:32px;">
          <a href="${args.baseUrl}/community" style="display:inline-block;background:#111111;color:#FFFFFF;padding:15px 24px;border-radius:0;font-weight:500;text-decoration:none;font-size:15px;">
            ${esc(t("cta"))}
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid #E1E1DE;padding-top:20px;">
          <p style="margin:0 0 6px;color:#696964;font-size:12px;line-height:1.7;">
            ${esc(tFooter("weeklyDigestNote"))}
          </p>
          <p style="margin:12px 0 0;color:#696964;font-size:12px;line-height:1.7;">
            ${emailFooterHtml()}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(args: {
  recipientHandle: string;
  digest: WeekDigest;
  baseUrl: string;
  locale: Locale;
  t: EmailT;
}): string {
  const { digest, t, locale } = args;
  const range = fmtRange(digest.rangeFrom, digest.rangeTo, locale);
  const lines = [
    t("text.header", { range }),
    "",
    t("greeting", { handle: args.recipientHandle }),
    "",
    t("text.posts", { count: digest.totalPosts }),
    t("text.prs", { count: digest.totalPRs }),
    t("text.sessions", { count: digest.totalSessionsCompleted }),
    t("text.formChecksReviewed", { count: digest.totalFormChecksReviewed }),
    t("text.newMembers", { count: digest.newMembers }),
    "",
  ];
  if (digest.topPosts.length > 0) {
    lines.push(t("text.topPostsHeader"));
    digest.topPosts.forEach((p, i) =>
      lines.push(`  ${String(i + 1).padStart(2, "0")}. ${p.who} (+${p.reactions}): ${p.content}`)
    );
    lines.push("");
  }
  lines.push(
    t("text.open", { url: `${args.baseUrl}/community` }),
    "",
    t("text.signoff"),
  );
  return lines.join("\n");
}

export async function sendWeeklyDigestEmail(args: {
  to: string;
  recipientHandle: string;
  digest: WeekDigest;
  baseUrl: string;
  locale: Locale;
}): Promise<SendResult> {
  const t = emailTranslator(args.locale, "Email.weeklyDigest");
  const tFooter = emailTranslator(args.locale, "Email.footer");
  const range = fmtRange(args.digest.rangeFrom, args.digest.rangeTo, args.locale);
  return sendEmail({
    to: args.to,
    subject: t("subject", { range }),
    html: renderHtml({
      recipientHandle: args.recipientHandle,
      digest: args.digest,
      baseUrl: args.baseUrl,
      locale: args.locale,
      t,
      tFooter,
    }),
    text: renderText({
      recipientHandle: args.recipientHandle,
      digest: args.digest,
      baseUrl: args.baseUrl,
      locale: args.locale,
      t,
    }),
  });
}
