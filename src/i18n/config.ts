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
