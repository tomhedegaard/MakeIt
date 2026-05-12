/**
 * Reusable footer fragments for transactional emails. Centralizes
 * the "{entity} · {address} · {domain}" line so a change in
 * COMPANY.legal.* or COMPANY.marketing* propagates to every
 * email template at once.
 *
 * Two variants because transactional mail has both an HTML body
 * (for the link styling) and a plain-text body (for accessibility
 * + spam-score reasons): keep them paired so they stay consistent.
 */
import { COMPANY } from "@/lib/company";

function legalLineParts(): string[] {
  return [COMPANY.legal.entity ?? COMPANY.name, COMPANY.legal.address ?? ""]
    .filter(Boolean) as string[];
}

/** Single-line legal + domain string for inline use inside a styled paragraph. */
export function emailFooterHtml(): string {
  const legal = legalLineParts().join(" · ");
  const link = `<a href="${COMPANY.marketingUrl}" style="color:#A8A6A0;">${COMPANY.marketingDomain}</a>`;
  return `${legal} · ${link}`;
}

/** Plain-text equivalent for text/plain mime parts. */
export function emailFooterPlain(): string {
  return [...legalLineParts(), COMPANY.marketingDomain].join(" · ");
}
