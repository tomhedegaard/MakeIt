/**
 * Single source of truth for company information.
 *
 * Every place in the app that needs a brand name, contact email,
 * domain, social handle, or legal text reads from here. Edit this
 * file → redeploy → the change propagates everywhere on the next
 * build.
 *
 * If you find yourself typing "MakeIt // HQ" or "munk@nowmakeit.eu"
 * directly in a component, stop — add the missing field here and
 * import COMPANY instead. The compiler can then verify every call
 * site if a field is renamed.
 */

export const COMPANY = {
  /** Short display name. Used in headings and as the brand mark. */
  name: "MakeIt",

  /** Full product line used in page titles + chrome. */
  product: "MakeIt // HQ",

  /** One-line description shown in footer + OG meta. */
  tagline:
    "Det interne univers for crewet bag MakeIt — coaching, community og loyalitet samlet ét sted.",

  /** Pithy version for hero / og:description short form. */
  taglineShort: "MakeIt — for those who lift.",

  /** Legal entity info — fill in as it gets confirmed. */
  legal: {
    /** Registered company name. */
    entity: "MakeIt Danmark ApS",
    /** Danish CVR-number (8 digits). null until incorporated. */
    cvr: null as string | null,
    /** Public address visible on legal pages. Kept at city + country
     *  for now; switch to a full postal address when we have a public
     *  HQ to publish. */
    address: "København, Danmark",
    /** Two-letter ISO country code for legal jurisdiction. */
    country: "DK",
    /** Year the platform launched (used for copyright lines + about). */
    foundedYear: 2026,
  },

  /** Production marketing site (homepage / brand). */
  marketingDomain: "nowmakeit.eu",
  marketingUrl: "https://www.nowmakeit.eu",

  /** Production app domain. Changes ONCE at official launch when we
   *  flip from the test subdomain to hq.nowmakeit.eu. The metadataBase
   *  in app/layout.tsx, the Stripe webhook URL, and the OAuth redirect
   *  whitelists all key off this value (via layout + SETUP.md). */
  appDomain: "makeit.tomhedegaard.dk",
  appUrl: "https://makeit.tomhedegaard.dk",

  /** Contact addresses grouped by purpose. Keep `support` as the default
   *  user-facing one; route specialised inquiries to dedicated boxes. */
  emails: {
    /** First-line contact for any user-facing problem. */
    support: "munk@nowmakeit.eu",
    /** Subscription / Stripe-related questions. */
    billing: "billing@nowmakeit.eu",
    /** Head coach personal — same as support for now, will split later. */
    headCoach: "munk@nowmakeit.eu",
    /** Transactional mail FROM address. Synced with RESEND_FROM_EMAIL
     *  env var — kept here for reference + so the legal page can show
     *  it correctly. */
    transactionalFrom: "noreply@mail.nowmakeit.eu",
    /** Reply-to on transactional mail. */
    replyTo: "hello@nowmakeit.eu",
  },

  /** Social handles. Null where we have no presence yet. */
  social: {
    instagramHandle: "makeiteu",
    instagramUrl: "https://www.instagram.com/makeiteu/",
    twitterHandle: null as string | null,
    youtubeHandle: null as string | null,
    tiktokHandle: null as string | null,
  },
} as const;

/** Pre-built mailto URLs for the most common contact points. */
export const SUPPORT_MAILTO = `mailto:${COMPANY.emails.support}`;
export const BILLING_MAILTO = `mailto:${COMPANY.emails.billing}`;
