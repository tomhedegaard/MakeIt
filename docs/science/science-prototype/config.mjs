// config.mjs — al kuratering, vægte og tærskler bor her (ikke i koden).
// I produktion ligger dette i en database/JSON så det kan ændres uden deploy.

export const CONFIG = {
  // Hvor mange dage tilbage et studie må være indekseret for at tælle som "nyt".
  recencyWindowDays: 220,

  // Samlet score (0-1) et studie skal nå for at blive UDGIVET.
  publishThreshold: 0.6,

  // Vægte til den samlede score. Summerer til 1.
  weights: { relevance: 0.35, evidence: 0.30, recency: 0.15, source: 0.15, consensus: 0.05 },

  // Den hårde nedre relevans-grænse: under denne droppes studiet uanset alt andet.
  minRelevance: 0.30,

  // --- TROVÆRDIGHEDS-GATE ---------------------------------------------------
  // Whitelist af tidsskrifter (her via ISSN). I produktion suppleres med
  // OpenAlex source-id + objektiv kvalitetsregel (DOAJ/PubMed + citationer).
  journalWhitelistISSN: new Set([
    "0112-1642", "1179-2035", // Sports Medicine
    "1550-2783",              // J. Int. Society of Sports Nutrition
    "1467-7881", "1467-789X", // Obesity Reviews
    "2000-8066",              // European Journal of Psychotraumatology
    "0785-3890", "1365-2060", // Annals of Medicine (legit -> passerer kilde, men falder på relevans)
    "0140-6736",              // The Lancet
    "1474-4422",              // Lancet Psychiatry (eks.)
  ]),

  // Kun disse publikationstyper passerer studietype-gaten.
  allowedPubTypes: new Set([
    "Meta-Analysis", "Systematic Review", "Randomized Controlled Trial",
    "Cochrane Review", "Guideline", "Consensus Development Conference",
  ]),

  // Ekskluder altid (retraction / svag evidens).
  blockPubTypes: new Set([
    "Retracted Publication", "Retraction of Publication",
    "Case Reports", "Comment", "Editorial", "Letter",
  ]),

  // --- RELEVANS: domæne-vokabular ------------------------------------------
  // MeSH-major-topics og titel-/abstract-termer der binder et studie til et domæne.
  domains: {
    krop: {
      label: "Krop", color: "#E8703A",
      terms: ["resistance training", "hypertrophy", "muscle strength", "muscle, skeletal",
        "strength training", "endurance training", "exercise", "training volume", "frequency",
        "vo2", "aerobic", "athletic performance", "muscle"],
    },
    mad: {
      label: "Mad", color: "#4CAF7D",
      terms: ["creatine", "dietary proteins", "protein", "dietary carbohydrates", "carbohydrate",
        "dietary supplements", "supplement", "nutrition", "diet", "omega-3", "intake",
        "body composition", "lean mass"],
    },
    sind: {
      label: "Sind", color: "#4F86C6",
      terms: ["depression", "anxiety", "mindfulness", "sleep", "mental health", "stress",
        "wellbeing", "mood", "cognitive", "psychological", "meditation"],
    },
  },

  // Evidens-styrke (ordinal) -> bruges i score OG som synligt badge.
  evidenceRank: {
    "Meta-Analysis":      { score: 1.0,  badge: "Meta-analyse" },
    "Systematic Review":  { score: 0.9,  badge: "Systematisk review" },
    "Cochrane Review":    { score: 1.0,  badge: "Cochrane-review" },
    "Randomized Controlled Trial": { score: 0.7, badge: "RCT" },
    "Guideline":          { score: 0.6,  badge: "Guideline" },
  },

  contact: "tomhedegaard@gmail.com", // bruges i 'polite pool' mod API'erne
};
