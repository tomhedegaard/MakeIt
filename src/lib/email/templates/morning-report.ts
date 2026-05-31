/**
 * Email — Munk Multiplier daily morning report (MM-7).
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3 (MM-1), §8
 *
 * Sent ~06:30 CET by the coach-morning-report cron to each coach who
 * hasn't opted out (members.notif_morning_report). The email IS the
 * morning report delivery in v0 — it mirrors the persisted
 * coach_morning_reports payload: urgent items, cross-cohort patterns,
 * and yesterday's roll-up, fronted by the computed Danish headline.
 *
 * Localized per recipient via members.locale. Fires from cron, so we
 * never read cookies — locale + base URL are passed in by the caller.
 * The headline is computed upstream (buildMorningHeadline, Danish) and
 * rendered verbatim.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import {
  dateLocaleTag,
  emailFooterHtml,
  emailTranslator,
  type EmailT,
} from "@/lib/email/footer";
import type { MorningReportPayload, MorningUrgency } from "@/lib/coach/types";
import type { Locale } from "@/i18n/config";

const ACCENT_URGENT = "#C97B3E";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(reportDate: string, locale: Locale): string {
  const tag = dateLocaleTag(locale);
  const d = new Date(reportDate + "T00:00:00");
  if (Number.isNaN(d.getTime())) return reportDate;
  return d.toLocaleDateString(tag, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function sustainedRow(
  m: { member_id: string; handle: string; days_low: number },
  baseUrl: string,
  t: EmailT,
): string {
  return `
    <tr><td style="padding:12px 0;border-bottom:1px solid rgba(245,242,236,0.08);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top;">
            <a href="${baseUrl}/coach/members/${m.member_id}" style="color:#F5F2EC;text-decoration:none;font-size:14px;">
              <strong>@${esc(m.handle)}</strong>
            </a>
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;font-family:'SF Mono',Menlo,Consolas,monospace;">
            <div style="color:${ACCENT_URGENT};font-size:13px;">${esc(t("sustainedLowItem", { days: m.days_low }))}</div>
          </td>
        </tr>
      </table>
    </td></tr>`;
}

function statCell(label: string, value: string): string {
  return `
    <td valign="top" style="padding:14px 8px;text-align:center;border-right:1px solid rgba(245,242,236,0.08);">
      <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;font-size:22px;color:#F5F2EC;">${esc(value)}</div>
      <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#A8A6A0;margin-top:4px;">${esc(label)}</div>
    </td>`;
}

function renderHtml(args: {
  recipientHandle: string;
  reportDate: string;
  payload: MorningReportPayload;
  headline: string;
  baseUrl: string;
  locale: Locale;
  t: EmailT;
}): string {
  const { payload, headline, baseUrl, locale, t } = args;
  const dateLabel = fmtDate(args.reportDate, locale);
  const u = payload.urgent;

  const sustainedRows = u.sustained_low_hrv_members
    .map((m) => sustainedRow(m, baseUrl, t))
    .join("");

  const urgentLines: string[] = [];
  if (u.open_adaptive_escalations > 0) {
    urgentLines.push(
      `<div style="font-size:14px;color:${ACCENT_URGENT};padding:8px 0;">${esc(t("escalations", { count: u.open_adaptive_escalations }))}</div>`,
    );
  }
  if (u.pending_form_checks.count > 0) {
    urgentLines.push(
      `<div style="font-size:13px;color:#A8A6A0;padding:8px 0;">${esc(
        t("pending", {
          count: u.pending_form_checks.count,
          hours: u.pending_form_checks.avg_wait_hours,
        }),
      )}</div>`,
    );
  }

  const hasUrgent = sustainedRows !== "" || urgentLines.length > 0;

  const urgentBlock = hasUrgent
    ? `<tr><td style="padding-bottom:24px;">
         <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT_URGENT};margin-bottom:8px;">${esc(t("urgentHeader"))}</div>
         ${sustainedRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sustainedRows}</table>` : ""}
         ${urgentLines.join("")}
       </td></tr>`
    : "";

  const patternsBlock =
    payload.patterns.length > 0
      ? `<tr><td style="padding-bottom:24px;">
           <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A8A6A0;margin-bottom:8px;">${esc(t("patternsHeader"))}</div>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
             ${payload.patterns
               .map(
                 (p) => `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(245,242,236,0.08);font-size:13px;color:#F5F2EC;line-height:1.5;">${esc(p.summary_da)}</td></tr>`,
               )
               .join("")}
           </table>
         </td></tr>`
      : "";

  const y = payload.yesterday;
  const statsCells = [
    statCell(
      t("stats.sessions"),
      t("sessionsValue", {
        completed: y.sessions_completed,
        skipped: y.sessions_skipped,
      }),
    ),
    statCell(t("stats.prs"), String(y.prs_noted)),
    statCell(t("stats.uploads"), String(y.form_checks_uploaded)),
    statCell(
      t("stats.adaptive"),
      t("adaptiveValue", {
        accepted: y.adaptive_accepted,
        modifiers: y.adaptive_modifiers,
      }),
    ),
  ].join("");

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
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-weight:900;letter-spacing:-0.02em;text-transform:uppercase;font-size:14px;color:#F5F2EC;">
            MAKEIT <span style="color:#56554F;margin:0 6px;">//</span> HQ
          </span>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A8A6A0;">
            ${esc(t("eyebrow", { date: dateLabel }))}
          </span>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <h1 style="margin:0;font-weight:900;font-size:28px;line-height:1.1;letter-spacing:-0.02em;color:#F5F2EC;">
            ${esc(headline)}
          </h1>
        </td></tr>

        ${urgentBlock}
        ${patternsBlock}

        <tr><td style="padding-bottom:8px;">
          <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#56554F;margin-bottom:8px;">${esc(t("yesterdayHeader"))}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#18181B;border:1px solid rgba(245,242,236,0.08);border-radius:10px;overflow:hidden;">
            <tr>${statsCells}</tr>
          </table>
        </td></tr>

        <tr><td style="padding-top:24px;padding-bottom:32px;">
          <a href="${baseUrl}/coach" style="display:inline-block;background:#F5F2EC;color:#0A0A0B;padding:14px 28px;border-radius:999px;font-weight:500;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-family:'SF Mono',Menlo,Consolas,monospace;">
            ${esc(t("cta"))}
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(245,242,236,0.08);padding-top:20px;">
          <p style="margin:0 0 6px;color:#56554F;font-size:11px;line-height:1.7;">
            ${esc(emailTranslator(locale, "Email.footer")("morningReportNote"))}
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

function renderText(args: {
  recipientHandle: string;
  reportDate: string;
  payload: MorningReportPayload;
  headline: string;
  baseUrl: string;
  locale: Locale;
  t: EmailT;
}): string {
  const { payload, headline, baseUrl, locale, t } = args;
  const u = payload.urgent;
  const lines: string[] = [
    t("text.header", { date: fmtDate(args.reportDate, locale) }),
    "",
    headline,
    "",
  ];

  const hasUrgent =
    u.sustained_low_hrv_members.length > 0 ||
    u.open_adaptive_escalations > 0 ||
    u.pending_form_checks.count > 0;
  if (hasUrgent) {
    lines.push(t("text.urgentHeader"));
    if (u.sustained_low_hrv_members.length > 0) {
      lines.push(t("text.sustainedLow"));
      u.sustained_low_hrv_members.forEach((m) => {
        lines.push(`  · @${m.handle} — ${m.days_low}`);
      });
    }
    if (u.open_adaptive_escalations > 0) {
      lines.push(t("text.escalations", { count: u.open_adaptive_escalations }));
    }
    if (u.pending_form_checks.count > 0) {
      lines.push(
        t("text.pending", {
          count: u.pending_form_checks.count,
          hours: u.pending_form_checks.avg_wait_hours,
        }),
      );
    }
    lines.push("");
  }

  if (payload.patterns.length > 0) {
    lines.push(t("text.patternsHeader"));
    payload.patterns.forEach((p) => lines.push(`  · ${p.summary_da}`));
    lines.push("");
  }

  const y = payload.yesterday;
  lines.push(
    t("text.yesterdayHeader"),
    t("text.yesterdayLine", {
      completed: y.sessions_completed,
      skipped: y.sessions_skipped,
      prs: y.prs_noted,
      uploads: y.form_checks_uploaded,
      accepted: y.adaptive_accepted,
      modifiers: y.adaptive_modifiers,
    }),
    "",
    t("text.open", { url: `${baseUrl}/coach` }),
    "",
    t("text.signoff"),
  );
  return lines.join("\n");
}

export async function sendCoachMorningReportEmail(args: {
  to: string;
  recipientHandle: string;
  reportDate: string;
  payload: MorningReportPayload;
  headline: string;
  /** Reserved for future urgency-tinted styling; currently informational. */
  urgency?: MorningUrgency;
  baseUrl: string;
  locale: Locale;
}): Promise<SendResult> {
  const t = emailTranslator(args.locale, "Email.coachMorningReport");
  const dateLabel = fmtDate(args.reportDate, args.locale);
  return sendEmail({
    to: args.to,
    subject: t("subject", { date: dateLabel }),
    html: renderHtml({
      recipientHandle: args.recipientHandle,
      reportDate: args.reportDate,
      payload: args.payload,
      headline: args.headline,
      baseUrl: args.baseUrl,
      locale: args.locale,
      t,
    }),
    text: renderText({
      recipientHandle: args.recipientHandle,
      reportDate: args.reportDate,
      payload: args.payload,
      headline: args.headline,
      baseUrl: args.baseUrl,
      locale: args.locale,
      t,
    }),
  });
}
