export const locales = ["da", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "da";

export const LOCALE_COOKIE = "mi_locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const localeLabels: Record<Locale, string> = {
  da: "Dansk",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Logged-in `members.locale` wins over a leftover marketing cookie.
 * Testy evidence (21-daen-*): EN chrome with Language=Danish was a
 * stale `mi_locale=en` on a `da` member row. Cookie still wins when
 * there is no member preference (anonymous / demo).
 */
export function resolveLocale(input: {
  cookie?: string | null;
  memberLocale?: string | null;
}): Locale {
  if (isLocale(input.memberLocale)) return input.memberLocale;
  if (isLocale(input.cookie)) return input.cookie;
  return defaultLocale;
}
