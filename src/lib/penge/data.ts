// Penge — privatøkonomi-dashboard. Data udtrukket 1:1 fra det
// oprindelige tomhedegaard/Penge dashboard.html (rapport 4. marts 2026).
// Beløb er månedsaggregater i hele kroner; kilden er markeret
// "Anonymiseret" i original-rapporten. Original bevaret i
// arkiv/penge/dashboard-original.html.

export type MonthCashflow = {
  /** Sorterbar månedsnøgle, fx "2025-03" */
  ym: string;
  /** Dansk label, fx "mar 25" */
  l: string;
  /** Indbetalt i måneden (kr.) */
  ind: number;
  /** Udbetalt i måneden (kr.) */
  ud: number;
};

export type BadgeTone = "green" | "red" | "neutral" | "gold";

export type Account = {
  id: string;
  nr: string;
  name: string;
  badge: { label: string; tone: BadgeTone };
  months: MonthCashflow[];
  /** Aktuel saldo (kr.) — udeladt for kreditkontoen, som har egne felter */
  saldo?: number;
  /** Kun Friværdikredit: disponibelt beløb på kreditten */
  raadighed?: number;
  /** Kun Friværdikredit: aktuel (negativ) kontosaldo, med ører */
  kontosaldo?: number;
};

export type PeriodKey = "1m" | "3m" | "6m" | "2024" | "2025" | "2026" | "all";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "1m", label: "1 mdr." },
  { key: "3m", label: "3 mdr." },
  { key: "6m", label: "6 mdr." },
  { key: "2024", label: "2024" },
  { key: "2025", label: "2025" },
  { key: "2026", label: "2026" },
  { key: "all", label: "Hele perioden" },
];

export function getPeriod(p: PeriodKey): { from: string; to: string; label: string } {
  switch (p) {
    case "1m":   return { from: "2026-03", to: "2026-03", label: "mar 2026" };
    case "3m":   return { from: "2025-12", to: "2026-03", label: "dec 2025 – mar 2026" };
    case "6m":   return { from: "2025-09", to: "2026-03", label: "sep 2025 – mar 2026" };
    case "2024": return { from: "2024-01", to: "2024-12", label: "jan – dec 2024" };
    case "2025": return { from: "2025-01", to: "2025-12", label: "jan – dec 2025" };
    case "2026": return { from: "2026-01", to: "2026-12", label: "jan – mar 2026" };
    case "all":  return { from: "2000-01", to: "2099-12", label: "aug 2024 – mar 2026" };
  }
}

export function filterMonths(months: MonthCashflow[], p: PeriodKey): MonthCashflow[] {
  const { from, to } = getPeriod(p);
  return months.filter((d) => d.ym >= from && d.ym <= to);
}

/** Dansk beløbsformat med ægte minustegn, fx "−12.345 kr." */
export function fmt(n: number): string {
  return (
    (n < 0 ? "−" : "") +
    Math.abs(n).toLocaleString("da-DK", { maximumFractionDigits: 0 }) +
    " kr."
  );
}

export const PRIVAT_KONTI: Account[] = [
  {
    id: "udlejning",
    nr: "XXXX 1290 71 0711",
    name: "Udlejningskonto",
    badge: { label: "Positiv", tone: "green" },
    saldo: 6498,
    months: [
      { ym: "2024-09", l: "sep 24", ind: 3823,  ud: 0 },
      { ym: "2024-10", l: "okt 24", ind: 10000, ud: 0 },
      { ym: "2024-11", l: "nov 24", ind: 10000, ud: 0 },
      { ym: "2024-12", l: "dec 24", ind: 20028, ud: 0 },
      { ym: "2025-01", l: "jan 25", ind: 0,     ud: 2624 },
      { ym: "2025-02", l: "feb 25", ind: 10000, ud: 24625 },
      { ym: "2025-03", l: "mar 25", ind: 13671, ud: 40273 },
      { ym: "2025-04", l: "apr 25", ind: 10000, ud: 10000 },
      { ym: "2025-05", l: "maj 25", ind: 10000, ud: 10000 },
      { ym: "2025-06", l: "jun 25", ind: 10000, ud: 10000 },
      { ym: "2025-07", l: "jul 25", ind: 10000, ud: 10000 },
      { ym: "2025-08", l: "aug 25", ind: 10000, ud: 10000 },
      { ym: "2025-09", l: "sep 25", ind: 10000, ud: 10000 },
      { ym: "2025-12", l: "dec 25", ind: 30,    ud: 0 },
      { ym: "2026-01", l: "jan 26", ind: 5985,  ud: 0 },
      { ym: "2026-02", l: "feb 26", ind: 4912,  ud: 0 },
      { ym: "2026-03", l: "mar 26", ind: 1904,  ud: 6333 },
    ],
  },
  {
    id: "forbrug",
    nr: "XXXX 1290 70 2433",
    name: "Forbrugskonto",
    badge: { label: "Aktiv", tone: "neutral" },
    saldo: 231,
    months: [
      { ym: "2024-06", l: "jun 24", ind: 50000, ud: 4974 },
      { ym: "2024-08", l: "aug 24", ind: 55519, ud: 38565 },
      { ym: "2024-09", l: "sep 24", ind: 28151, ud: 38316 },
      { ym: "2024-10", l: "okt 24", ind: 36912, ud: 59690 },
      { ym: "2024-11", l: "nov 24", ind: 65688, ud: 41760 },
      { ym: "2024-12", l: "dec 24", ind: 97,    ud: 26815 },
      { ym: "2025-01", l: "jan 25", ind: 22870, ud: 17323 },
      { ym: "2025-02", l: "feb 25", ind: 53908, ud: 34314 },
      { ym: "2025-03", l: "mar 25", ind: 18049, ud: 16334 },
      { ym: "2025-04", l: "apr 25", ind: 34352, ud: 63702 },
      { ym: "2025-05", l: "maj 25", ind: 30675, ud: 29503 },
      { ym: "2025-06", l: "jun 25", ind: 20597, ud: 27766 },
      { ym: "2025-07", l: "jul 25", ind: 63405, ud: 39744 },
      { ym: "2025-08", l: "aug 25", ind: 47602, ud: 23155 },
      { ym: "2025-09", l: "sep 25", ind: 31661, ud: 54966 },
      { ym: "2025-10", l: "okt 25", ind: 28298, ud: 43127 },
      { ym: "2025-11", l: "nov 25", ind: 25640, ud: 19404 },
      { ym: "2025-12", l: "dec 25", ind: 20815, ud: 22825 },
      { ym: "2026-01", l: "jan 26", ind: 53974, ud: 63856 },
      { ym: "2026-02", l: "feb 26", ind: 25000, ud: 23235 },
      { ym: "2026-03", l: "mar 26", ind: 0,     ud: 1423 },
    ],
  },
  {
    id: "budget",
    nr: "XXXX 1290 70 2441",
    name: "Budgetkonto",
    badge: { label: "Aktiv", tone: "neutral" },
    saldo: 775,
    months: [
      { ym: "2024-08", l: "aug 24", ind: 89859, ud: 24836 },
      { ym: "2024-09", l: "sep 24", ind: 3052,  ud: 56752 },
      { ym: "2024-10", l: "okt 24", ind: 76892, ud: 36795 },
      { ym: "2024-11", l: "nov 24", ind: 9370,  ud: 51059 },
      { ym: "2024-12", l: "dec 24", ind: 55280, ud: 61741 },
      { ym: "2025-01", l: "jan 25", ind: 40743, ud: 36266 },
      { ym: "2025-02", l: "feb 25", ind: 44045, ud: 23298 },
      { ym: "2025-03", l: "mar 25", ind: 29000, ud: 37947 },
      { ym: "2025-04", l: "apr 25", ind: 14000, ud: 23154 },
      { ym: "2025-05", l: "maj 25", ind: 54000, ud: 23706 },
      { ym: "2025-06", l: "jun 25", ind: 9000,  ud: 38418 },
      { ym: "2025-07", l: "jul 25", ind: 41000, ud: 22250 },
      { ym: "2025-08", l: "aug 25", ind: 19899, ud: 39363 },
      { ym: "2025-09", l: "sep 25", ind: 24000, ud: 33339 },
      { ym: "2025-10", l: "okt 25", ind: 35208, ud: 17391 },
      { ym: "2025-11", l: "nov 25", ind: 16000, ud: 22776 },
      { ym: "2025-12", l: "dec 25", ind: 4891,  ud: 33920 },
      { ym: "2026-01", l: "jan 26", ind: 61782, ud: 36736 },
      { ym: "2026-02", l: "feb 26", ind: 24180, ud: 20970 },
      { ym: "2026-03", l: "mar 26", ind: 48,    ud: 10755 },
    ],
  },
  {
    id: "frivaerdi",
    nr: "XXXX 1290 70 8989",
    name: "Friværdikredit",
    badge: { label: "Kredit", tone: "neutral" },
    raadighed: 372142,
    kontosaldo: -947858.37,
    months: [
      { ym: "2024-08", l: "aug 24", ind: 0,     ud: 29375 },
      { ym: "2024-09", l: "sep 24", ind: 0,     ud: 5111 },
      { ym: "2024-10", l: "okt 24", ind: 0,     ud: 15000 },
      { ym: "2024-12", l: "dec 24", ind: 0,     ud: 42776 },
      { ym: "2025-01", l: "jan 25", ind: 0,     ud: 44465 },
      { ym: "2025-02", l: "feb 25", ind: 0,     ud: 13857 },
      { ym: "2025-03", l: "mar 25", ind: 0,     ud: 8415 },
      { ym: "2025-04", l: "apr 25", ind: 0,     ud: 75000 },
      { ym: "2025-05", l: "maj 25", ind: 38601, ud: 65000 },
      { ym: "2025-06", l: "jun 25", ind: 0,     ud: 49544 },
      { ym: "2025-07", l: "jul 25", ind: 0,     ud: 7000 },
      { ym: "2025-08", l: "aug 25", ind: 0,     ud: 25000 },
      { ym: "2025-09", l: "sep 25", ind: 0,     ud: 60949 },
      { ym: "2025-11", l: "nov 25", ind: 0,     ud: 30000 },
      { ym: "2025-12", l: "dec 25", ind: 0,     ud: 12108 },
      { ym: "2026-01", l: "jan 26", ind: 0,     ud: 20000 },
    ],
  },
  {
    id: "hustru",
    nr: "XXXX 1290 70 2425",
    name: "Hustruens konto",
    badge: { label: "Aktiv", tone: "neutral" },
    saldo: 76,
    months: [
      { ym: "2024-08", l: "aug 24", ind: 23313, ud: 0 },
      { ym: "2024-09", l: "sep 24", ind: 17612, ud: 0 },
      { ym: "2024-10", l: "okt 24", ind: 22715, ud: 29558 },
      { ym: "2024-11", l: "nov 24", ind: 18155, ud: 15310 },
      { ym: "2024-12", l: "dec 24", ind: 31279, ud: 19895 },
      { ym: "2025-01", l: "jan 25", ind: 5444,  ud: 27597 },
      { ym: "2025-02", l: "feb 25", ind: 0,     ud: 17927 },
      { ym: "2025-03", l: "mar 25", ind: 19378, ud: 22522 },
      { ym: "2025-04", l: "apr 25", ind: 3573,  ud: 20444 },
      { ym: "2025-05", l: "maj 25", ind: 12959, ud: 17566 },
      { ym: "2025-06", l: "jun 25", ind: 49569, ud: 21166 },
      { ym: "2025-07", l: "jul 25", ind: 23859, ud: 18348 },
      { ym: "2025-08", l: "aug 25", ind: 1211,  ud: 21945 },
      { ym: "2025-09", l: "sep 25", ind: 31467, ud: 35072 },
      { ym: "2025-10", l: "okt 25", ind: 27615, ud: 18421 },
      { ym: "2025-11", l: "nov 25", ind: 12563, ud: 20377 },
      { ym: "2025-12", l: "dec 25", ind: 1709,  ud: 15868 },
      { ym: "2026-01", l: "jan 26", ind: 59508, ud: 30257 },
      { ym: "2026-02", l: "feb 26", ind: 12797, ud: 21165 },
      { ym: "2026-03", l: "mar 26", ind: 280,   ud: 1489 },
    ],
  },
];

export const VIRK_KONTI: Account[] = [
  {
    id: "drift",
    nr: "5442 0256 846",
    name: "Driftskonto",
    badge: { label: "Aktiv", tone: "neutral" },
    saldo: 72873,
    months: [
      { ym: "2025-05", l: "maj 25", ind: 48481,  ud: 860 },
      { ym: "2025-06", l: "jun 25", ind: 58475,  ud: 3873 },
      { ym: "2025-07", l: "jul 25", ind: 76045,  ud: 83836 },
      { ym: "2025-08", l: "aug 25", ind: 95124,  ud: 185636 },
      { ym: "2025-09", l: "sep 25", ind: 113130, ud: 54864 },
      { ym: "2025-10", l: "okt 25", ind: 33375,  ud: 76311 },
      { ym: "2025-11", l: "nov 25", ind: 112209, ud: 52535 },
      { ym: "2025-12", l: "dec 25", ind: 56180,  ud: 45000 },
      { ym: "2026-01", l: "jan 26", ind: 173659, ud: 211885 },
      { ym: "2026-02", l: "feb 26", ind: 119112, ud: 118813 },
      { ym: "2026-03", l: "mar 26", ind: 50812,  ud: 30119 },
    ],
  },
  {
    id: "skat",
    nr: "5442 0257 265",
    name: "Skattekonto",
    badge: { label: "Moms & Skat", tone: "gold" },
    saldo: 94728,
    months: [
      { ym: "2025-08", l: "aug 25", ind: 70000, ud: 0 },
      { ym: "2025-09", l: "sep 25", ind: 20000, ud: 11397 },
      { ym: "2025-10", l: "okt 25", ind: 15000, ud: 8875 },
      { ym: "2025-11", l: "nov 25", ind: 10000, ud: 0 },
      { ym: "2025-12", l: "dec 25", ind: 0,     ud: 35000 },
      { ym: "2026-01", l: "jan 26", ind: 50000, ud: 0 },
      { ym: "2026-02", l: "feb 26", ind: 45000, ud: 30000 },
      { ym: "2026-03", l: "mar 26", ind: 0,     ud: 30000 },
    ],
  },
  {
    id: "klient",
    nr: "5442 0332 526",
    name: "Klientkonto",
    badge: { label: "Aktiv", tone: "neutral" },
    saldo: 64557,
    months: [
      { ym: "2025-06", l: "jun 25", ind: 17188,  ud: 17188 },
      { ym: "2025-07", l: "jul 25", ind: 119247, ud: 46045 },
      { ym: "2025-08", l: "aug 25", ind: 196775, ud: 111614 },
      { ym: "2025-09", l: "sep 25", ind: 175791, ud: 200416 },
      { ym: "2025-10", l: "okt 25", ind: 65875,  ud: 37750 },
      { ym: "2025-11", l: "nov 25", ind: 111924, ud: 178806 },
      { ym: "2025-12", l: "dec 25", ind: 14548,  ud: 0 },
      { ym: "2026-01", l: "jan 26", ind: 235858, ud: 272705 },
      { ym: "2026-02", l: "feb 26", ind: 62455,  ud: 72768 },
      { ym: "2026-03", l: "mar 26", ind: 23000,  ud: 20812 },
    ],
  },
];

export type SalaryMonth = { ym: string; l: string; v: number };

/** Løn udbetalt fra virksomheden til privat */
export const LOEN: { tom: SalaryMonth[]; dina: SalaryMonth[] } = {
  tom: [
    { ym: "2025-07", l: "jul 25", v: 30000 },
    { ym: "2025-08", l: "aug 25", v: 30000 },
    { ym: "2025-09", l: "sep 25", v: 20000 },
    { ym: "2025-10", l: "okt 25", v: 25000 },
    { ym: "2026-01", l: "jan 26", v: 50000 },
    { ym: "2026-02", l: "feb 26", v: 25000 },
  ],
  dina: [
    { ym: "2025-10", l: "okt 25", v: 11172 },
    { ym: "2026-01", l: "jan 26", v: 23487 },
  ],
};

export const RAPPORT_DATO = "4. marts 2026";
