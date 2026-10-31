/**
 * Displayed prices. Stripe charges what STRIPE_PRICE_CREW and
 * STRIPE_PRICE_ONE_ON_ONE point at, so change both together.
 */
export const pricing = {
  // Crew membership, monthly only at launch (January 2027)
  member: {
    amount: "399",
    currency: "kr",
    period: "md",
  },
  // 1:1 add-on (the only human-only product)
  oneOnOne: {
    amount: "1.499",
    currency: "kr",
    period: "md",
    spots: 8,
  },
} as const;
