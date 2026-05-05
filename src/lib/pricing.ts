/**
 * Pricing & positioning copy — placeholder values.
 * Swap when final numbers are locked.
 */
export const pricing = {
  // Top-line monthly price for crew membership / coaching access
  member: {
    amount: "[XX]",
    currency: "kr",
    period: "md",
  },
  // Approximate market average to compare against
  market: {
    amount: "[YY]",
    currency: "kr",
    period: "md",
    label: "markedssnit for personlig coaching",
  },
  // 1:1 add-on (the only human-only product)
  oneOnOne: {
    amount: "[ZZ]",
    currency: "kr",
    period: "md",
    spots: "8 pladser",
  },
} as const;

export const positioning = {
  eyebrow: "Sådan holder vi coaching tilgængelig",
  headline: "AI gør det generiske. Mennesker gør det vigtige.",
  sub:
    "Vi automatiserer det der kan automatiseres — programopbygning, form-tjek, " +
    "progression — og bruger mennesker dér hvor det faktisk batter: 1:1, " +
    "milepæle og fællesskab. Resultatet er coaching der koster en brøkdel " +
    "af markedet, uden at føles billigt.",
} as const;
