/**
 * Reusable footer fragments for transactional emails. Centralizes
 * the "{entity} · {address} · {domain}" line so a change in
 * COMPANY.legal.* or COMPANY.marketing* propagates to every
 * email template at once.
 *
 * Two variants because transactional mail has both an HTML body
 * (for the link styling) and a plain-text body (for accessibility
 * + spam-score reasons): keep them paired so they stay consistent.
 *
 * Also exposes shared translator helpers for the email templates so
 * each template doesn't have to wire up `createTranslator` itself.
 * Emails always render from the recipient's stored `members.locale`
 * (never the request cookie — these may fire from a cron with no
 * request context).
 */
import { createTranslator } from "use-intl/core";
import { COMPANY } from "@/lib/company";
import type { Locale } from "@/i18n/config";
import daMessages from "../../../messages/da";
import enMessages from "../../../messages/en";

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

/** Loose translator signature — templates pass dot-path keys and ICU values. */
export type EmailT = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const messagesByLocale = { da: daMessages, en: enMessages } as const;

/**
 * Build a translator bound to `namespace` under the recipient's locale.
 * Used by every email template. The locale comes from the caller (which
 * resolves it from `members.locale`), so this works in cron handlers
 * with no request scope.
 */
export function emailTranslator(locale: Locale, namespace: string): EmailT {
  // `createTranslator` is strongly-typed against the global Messages shape;
  // we type the templates loosely so each one can use its own dot-paths
  // without forcing the augmentation on the whole codebase.
  return createTranslator({
    locale,
    messages: messagesByLocale[locale],
    namespace: namespace as never,
  }) as unknown as EmailT;
}

/** Locale tag used for `toLocaleDateString` inside templates. */
export function dateLocaleTag(locale: Locale): string {
  return locale === "da" ? "da-DK" : "en-GB";
}
