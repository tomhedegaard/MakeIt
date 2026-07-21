/**
 * Modul-katalog — den statiske sandhed om tilkøbsmoduler.
 * Samme ånd som lib/stripe.ts / lib/pricing.ts: ren konfiguration,
 * ingen runtime-afhængigheder. Pris-opslag sker i lib/stripe.ts via
 * `priceEnv`. Domænefarver matcher data-domain-systemet (body/food/heart/mind).
 */
export const MODULE_KEYS = ["train", "nutrition", "hrv", "mind"] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleDef = {
  key: ModuleKey;
  domain: "body" | "food" | "heart" | "mind";
  route: string; // modulets gratis-gulv/root-rute
  labelKey: string; // i18n-nøgle i messages/{locale}/Modules.json
  priceEnv: string; // navn på env-var med Stripe price id
  trialDays: number; // Stripe trial_period_days ved checkout
};

export const MODULES: Record<ModuleKey, ModuleDef> = {
  train: {
    key: "train",
    domain: "body",
    route: "/coaching",
    labelKey: "train.label",
    priceEnv: "STRIPE_PRICE_TRAIN",
    trialDays: 7,
  },
  nutrition: {
    key: "nutrition",
    domain: "food",
    route: "/nutrition",
    labelKey: "nutrition.label",
    priceEnv: "STRIPE_PRICE_NUTRITION",
    trialDays: 7,
  },
  hrv: {
    key: "hrv",
    domain: "heart",
    route: "/hrv",
    labelKey: "hrv.label",
    priceEnv: "STRIPE_PRICE_HRV",
    trialDays: 7,
  },
  mind: {
    key: "mind",
    domain: "mind",
    route: "/mind",
    labelKey: "mind.label",
    priceEnv: "STRIPE_PRICE_MIND",
    trialDays: 7,
  },
};

/** Bundle-ekspansion: crew låser alle indholds-moduler op. */
export const BUNDLE_GRANTS: { crew: readonly ModuleKey[] } = {
  crew: MODULE_KEYS,
};
