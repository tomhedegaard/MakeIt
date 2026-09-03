/**
 * Public conversion paths for invite-less first visits.
 *
 * Hero / nav / footer must not offer a blind /login as the primary
 * "get access" action. Invite holders still reach login as a
 * secondary path. `#waitlist` works on the homepage; `/#waitlist`
 * works from /login and other public pages.
 */
export const PUBLIC_WAITLIST_HREF = "/#waitlist";
export const PUBLIC_LEARN_HREF = "/#crew";
export const PUBLIC_LOGIN_HREF = "/login";

/** Store listings are not published yet (docs/APP_STORE_PLAN.md). */
export const PUBLIC_APP_STORE_HREF: string | null = null;
