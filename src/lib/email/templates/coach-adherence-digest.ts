/**
 * Email — weekly coach digest of crew nutrition adherence. Sent
 * Monday morning so the coach can scan who needs outreach + who
 * deserves a "stærk uge"-shoutout before the week's check-ins.
 *
 * Localized per recipient via `members.locale`. Fires from cron,
 * so we never read cookies — locale is passed in by the caller.
 */
import "server-only";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import {
  dateLocaleTag,
  emailFooterHtml,
  emailTranslator,
  type EmailT,
} from "@/lib/email/footer";
import type {
  CrewAdherenceDigest,
  CrewMemberDigest,
} from "@/lib/data/coach-adherence-digest";
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

function memberRow(m: CrewMemberDigest, baseUrl: string, accent: string): string {
  const weight =
    m.weightDeltaKg !== null
      ? `${m.weightDeltaKg > 0 ? "+" : ""}${m.weightDeltaKg.toFixed(1)} kg`
      : "—";
  const note = m.suggestedAction ? esc(m.suggestedAction) : "";
  return `
    <tr><td style="padding:12px 0;border-bottom:1px solid rgba(245,242,236,0.08);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top;">
            <a href="${baseUrl}/coach/members/${m.memberId}" style="color:#F5F2EC;text-decoration:none;font-size:14px;">
              <strong>@${esc(m.handle)}</strong>${m.displayName ? ` · <span style="color:#A8A6A0;">${esc(m.displayName)}</span>` : ""}
            </a>
            ${note ? `<div style="font-size:12px;color:#A8A6A0;line-height:1.5;margin-top:4px;">${note}</div>` : ""}
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;font-family:'SF Mono',Menlo,Consolas,monospace;">
            <div style="color:${accent};font-size:18px;font-variant-numeric:tabular-nums;">${m.adherencePct}%</div>
            <div style="color:#56554F;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin-top:2px;">${weight}</div>
          </td>
        </tr>
      </table>
    </td></tr>`;
}

function renderHtml(args: {
  recipientHandle: string;
  digest: CrewAdherenceDigest;
  baseUrl: string;
  locale: Locale;
  t: EmailT;
  tFooter: EmailT;
}): string {
  const { digest, t, tFooter, locale } = args;
  const range = fmtRange(digest.rangeFrom, digest.rangeTo, locale);

  const stats = [
    { label: t("stats.crew"), value: digest.totalMembers },
    { label: t("stats.active"), value: digest.totalActive },
    { label: t("stats.avgPct"), value: digest.averageAdherence },
    { label: t("stats.atRisk"), value: digest.atRisk.length },
  ];

  const statsCells = stats
    .map(
      (s) => `
      <td valign="top" style="padding:14px 8px;text-align:center;border-right:1px solid rgba(245,242,236,0.08);">
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;font-size:24px;color:#F5F2EC;">${s.value}</div>
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#A8A6A0;margin-top:4px;">${esc(s.label)}</div>
      </td>`,
    )
    .join("");

  const atRiskRows = digest.atRisk
    .map((m) => memberRow(m, args.baseUrl, "#C97B3E"))
    .join("");

  const strongRows = digest.strong
    .map((m) => memberRow(m, args.baseUrl, "#F5F2EC"))
    .join("");

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
            ${esc(t("eyebrow", { range }))}
          </span>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <h1 style="margin:0;font-weight:900;font-size:30px;line-height:1.05;letter-spacing:-0.02em;color:#F5F2EC;">
            ${esc(t("greeting", { handle: args.recipientHandle }))}
          </h1>
          ${
            digest.totalMembers === 0
              ? `<p style="color:#A8A6A0;font-size:14px;line-height:1.6;margin:16px 0 0;">${esc(t("emptyCrew"))}</p>`
              : `<p style="color:#A8A6A0;font-size:14px;line-height:1.6;margin:16px 0 0;">${esc(t("intro"))}</p>`
          }
        </td></tr>

        ${
          digest.totalMembers > 0
            ? `<tr><td style="padding-bottom:24px;">
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#18181B;border:1px solid rgba(245,242,236,0.08);border-radius:10px;overflow:hidden;">
                   <tr>${statsCells}</tr>
                 </table>
               </td></tr>`
            : ""
        }

        ${
          atRiskRows
            ? `<tr><td style="padding-bottom:24px;">
                 <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#C97B3E;margin-bottom:8px;">${esc(t("atRiskHeader"))}</div>
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${atRiskRows}</table>
               </td></tr>`
            : ""
        }

        ${
          strongRows
            ? `<tr><td style="padding-bottom:24px;">
                 <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A8A6A0;margin-bottom:8px;">${esc(t("strongHeader"))}</div>
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${strongRows}</table>
               </td></tr>`
            : ""
        }

        ${
          digest.steadyCount > 0
            ? `<tr><td style="padding-bottom:20px;">
                 <p style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#56554F;margin:0;">
                   ${esc(t("steadyLine", { count: digest.steadyCount }))}
                 </p>
               </td></tr>`
            : ""
        }

        <tr><td style="padding-top:8px;padding-bottom:32px;">
          <a href="${args.baseUrl}/coach" style="display:inline-block;background:#F5F2EC;color:#0A0A0B;padding:14px 28px;border-radius:999px;font-weight:500;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-family:'SF Mono',Menlo,Consolas,monospace;">
            ${esc(t("cta"))}
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(245,242,236,0.08);padding-top:20px;">
          <p style="margin:0 0 6px;color:#56554F;font-size:11px;line-height:1.7;">
            ${esc(tFooter("coachDigestNote"))}
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
  digest: CrewAdherenceDigest;
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
  ];

  if (digest.totalMembers === 0) {
    lines.push(t("emptyCrew"));
  } else {
    lines.push(
      t("text.summary", {
        total: digest.totalMembers,
        active: digest.totalActive,
        avg: digest.averageAdherence,
        atRisk: digest.atRisk.length,
      }),
      "",
    );

    if (digest.atRisk.length > 0) {
      lines.push(t("text.atRiskHeader"));
      digest.atRisk.forEach((m) => {
        const weight =
          m.weightDeltaKg !== null
            ? `, ${m.weightDeltaKg > 0 ? "+" : ""}${m.weightDeltaKg.toFixed(1)} kg`
            : "";
        lines.push(`  · @${m.handle} — ${m.adherencePct}%${weight}`);
        if (m.suggestedAction) lines.push(`    ${m.suggestedAction}`);
      });
      lines.push("");
    }

    if (digest.strong.length > 0) {
      lines.push(t("text.strongHeader"));
      digest.strong.forEach((m) => {
        lines.push(`  · @${m.handle} — ${m.adherencePct}%`);
      });
      lines.push("");
    }

    if (digest.steadyCount > 0) {
      lines.push(t("steadyLine", { count: digest.steadyCount }));
      lines.push("");
    }
  }

  lines.push(
    t("text.open", { url: `${args.baseUrl}/coach` }),
    "",
    t("text.signoff"),
  );
  return lines.join("\n");
}

export async function sendCoachAdherenceDigestEmail(args: {
  to: string;
  recipientHandle: string;
  digest: CrewAdherenceDigest;
  baseUrl: string;
  locale: Locale;
}): Promise<SendResult> {
  const t = emailTranslator(args.locale, "Email.coachAdherenceDigest");
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
