/**
 * Public conversion destinations on the marketing site.
 *
 * New visitors do not have an invite. "/login" is a blind end for
 * them. The waitlist on the landing page is the honest next step.
 * Invite holders still reach login as a secondary path.
 * `#waitlist` works on the homepage; `/#waitlist` works from /login
 * and other public pages.
 */
export const PUBLIC_WAITLIST_HREF = "/#waitlist";
export const PUBLIC_ACCESS_HREF = PUBLIC_WAITLIST_HREF;
export const PUBLIC_LEARN_HREF = "/#crew";
export const PUBLIC_LOGIN_HREF = "/login";
export const MEMBER_LOGIN_HREF = PUBLIC_LOGIN_HREF;

/** Store listings are not published yet (docs/APP_STORE_PLAN.md). */
export const PUBLIC_APP_STORE_HREF: string | null = null;
