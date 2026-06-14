export const meta = {
  name: 'generate-exercise-library',
  description: 'Generér dansk coaching-metadata for MoveKit-øvelser (draft til review)',
  phases: [{ title: 'Generér', detail: 'parallelle agenter pr. batch á 10 øvelser' }],
};

const ITEMS = [{"slug": "abdominals-stretch-variation-four", "name": "Abdominals Stretch Variation Four", "equipment": "bodyweight"}, {"slug": "abdominals-stretch-variation-one", "name": "Abdominals Stretch Variation One", "equipment": "bodyweight"}, {"slug": "abdominals-stretch-variation-three", "name": "Abdominals Stretch Variation Three", "equipment": "bodyweight"}, {"slug": "abdominals-stretch-variation-two", "name": "Abdominals Stretch Variation Two", "equipment": "bodyweight"}, {"slug": "band-curl", "name": "Band Curl", "equipment": "band"}, {"slug": "band-high-face-pull", "name": "Band High Face Pull", "equipment": "band"}, {"slug": "band-hip-abduction", "name": "Band Hip Abduction", "equipment": "band"}, {"slug": "band-kneeling-pulldown", "name": "Band Kneeling Pulldown", "equipment": "band"}, {"slug": "band-lateral-raise", "name": "Band Lateral Raise", "equipment": "band"}, {"slug": "band-pullover", "name": "Band Pullover", "equipment": "band"}, {"slug": "band-romanian-deadlift", "name": "Band Romanian Deadlift", "equipment": "band"}, {"slug": "band-row", "name": "Band Row", "equipment": "band"}, {"slug": "band-seated-pulldown", "name": "Band Seated Pulldown", "equipment": "band"}, {"slug": "band-shrug", "name": "Band Shrug", "equipment": "band"}, {"slug": "band-single-arm-lateral-raise", "name": "Band Single Arm Lateral Raise", "equipment": "band"}, {"slug": "band-wood-chopper", "name": "Band Wood Chopper", "equipment": "band"}, {"slug": "barbell-banded-back-squat", "name": "Barbell Banded Back Squat", "equipment": "barbell"}, {"slug": "barbell-behind-the-back-30-degree-shrug", "name": "Barbell Behind The Back 30 Degree Shrug", "equipment": "barbell"}, {"slug": "barbell-clean-and-press", "name": "Barbell Clean And Press", "equipment": "barbell"}, {"slug": "barbell-close-grip-bench-press", "name": "Barbell Close Grip Bench Press", "equipment": "barbell"}, {"slug": "barbell-drag-curl", "name": "Barbell Drag Curl", "equipment": "barbell"}, {"slug": "barbell-front-rack-step-up-knee-drive", "name": "Barbell Front Rack Step Up Knee Drive", "equipment": "barbell"}, {"slug": "barbell-high-incline-bench-press", "name": "Barbell High Incline Bench Press", "equipment": "barbell"}, {"slug": "barbell-incline-bench-press", "name": "Barbell Incline Bench Press", "equipment": "barbell"}, {"slug": "barbell-muscle-snatch", "name": "Barbell Muscle Snatch", "equipment": "barbell"}, {"slug": "barbell-power-snatch", "name": "Barbell Power Snatch", "equipment": "barbell"}, {"slug": "barbell-pullover", "name": "Barbell Pullover", "equipment": "barbell"}, {"slug": "barbell-rack-pull", "name": "Barbell Rack Pull", "equipment": "barbell"}, {"slug": "barbell-shrug", "name": "Barbell Shrug", "equipment": "barbell"}, {"slug": "barbell-snatch", "name": "Barbell Snatch", "equipment": "barbell"}, {"slug": "barbell-spinal-jefferson-curl", "name": "Barbell Spinal Jefferson Curl", "equipment": "barbell"}, {"slug": "barbell-split-squat", "name": "Barbell Split Squat", "equipment": "barbell"}, {"slug": "barbell-step-up-knee-drive", "name": "Barbell Step Up Knee Drive", "equipment": "barbell"}, {"slug": "barbell-thruster", "name": "Barbell Thruster", "equipment": "barbell"}, {"slug": "barbell-upright-row", "name": "Barbell Upright Row", "equipment": "barbell"}, {"slug": "barbell-wrist-curl", "name": "Barbell Wrist Curl", "equipment": "barbell"}, {"slug": "bench-dips", "name": "Bench Dips", "equipment": "bodyweight"}, {"slug": "bodyweight-alternating-lateral-lunge", "name": "Bodyweight Alternating Lateral Lunge", "equipment": "bodyweight"}, {"slug": "bodyweight-alternating-reverse-lunges", "name": "Bodyweight Alternating Reverse Lunges", "equipment": "bodyweight"}, {"slug": "bodyweight-box-squat", "name": "Bodyweight Box Squat", "equipment": "bodyweight"}, {"slug": "bodyweight-deadlift", "name": "Bodyweight Deadlift", "equipment": "bodyweight"}, {"slug": "bodyweight-donkey-calf-raise", "name": "Bodyweight Donkey Calf Raise", "equipment": "bodyweight"}, {"slug": "bodyweight-elevated-push-up", "name": "Bodyweight Elevated Push Up", "equipment": "bodyweight"}, {"slug": "bodyweight-hip-abduction", "name": "Bodyweight Hip Abduction", "equipment": "bodyweight"}, {"slug": "bodyweight-knee-push-ups", "name": "Bodyweight Knee Push Ups", "equipment": "bodyweight"}, {"slug": "bodyweight-reverse-lunge", "name": "Bodyweight Reverse Lunge", "equipment": "bodyweight"}, {"slug": "bodyweight-russian-twist", "name": "Bodyweight Russian Twist", "equipment": "bodyweight"}, {"slug": "bodyweight-spinal-jefferson-curl", "name": "Bodyweight Spinal Jefferson Curl", "equipment": "bodyweight"}, {"slug": "bodyweight-squat", "name": "Bodyweight Squat", "equipment": "bodyweight"}, {"slug": "box-jump", "name": "Box Jump", "equipment": "bodyweight"}, {"slug": "bulgarian-split-squat", "name": "Bulgarian Split Squat", "equipment": "bodyweight"}, {"slug": "burpee", "name": "Burpee", "equipment": "bodyweight"}, {"slug": "cable-30-degree-shrug", "name": "Cable 30 Degree Shrug", "equipment": "cable"}, {"slug": "cable-bar-curl", "name": "Cable bar Curl", "equipment": "cable"}, {"slug": "cable-bar-face-pull", "name": "Cable bar Face Pull", "equipment": "cable"}, {"slug": "cable-bench-chest-fly", "name": "Cable Bench Chest Fly", "equipment": "cable"}, {"slug": "cable-bench-press", "name": "Cable Bench Press", "equipment": "cable"}, {"slug": "cable-bench-straight-leg-kickback", "name": "Cable Bench Straight Leg Kickback", "equipment": "cable"}, {"slug": "cable-chest-press", "name": "Cable Chest Press", "equipment": "cable"}, {"slug": "cable-decline-bench-press", "name": "Cable Decline Bench Press", "equipment": "cable"}, {"slug": "cable-incline-bench-press", "name": "Cable Incline Bench Press", "equipment": "cable"}, {"slug": "cable-overhead-press", "name": "Cable Overhead Press", "equipment": "cable"}, {"slug": "cable-pec-fly", "name": "Cable Pec Fly", "equipment": "cable"}, {"slug": "cable-rope-kneeling-face-pull", "name": "Cable Rope Kneeling Face Pull", "equipment": "cable"}, {"slug": "cable-rope-pushdown", "name": "Cable Rope Pushdown", "equipment": "cable"}, {"slug": "cable-row-bar-standing-row", "name": "Cable Row bar Standing Row", "equipment": "cable"}, {"slug": "cable-seated-rope-face-pull", "name": "Cable Seated Rope Face Pull", "equipment": "cable"}, {"slug": "cable-side-bend", "name": "Cable Side Bend", "equipment": "cable"}, {"slug": "cable-single-arm-neutral-grip-row", "name": "Cable Single Arm Neutral Grip Row", "equipment": "cable"}, {"slug": "cable-single-arm-rope-pushdown", "name": "Cable Single Arm Rope Pushdown", "equipment": "cable"}, {"slug": "cable-single-arm-underhand-grip-row", "name": "Cable Single Arm Underhand Grip Row", "equipment": "cable"}, {"slug": "cable-standing-low-to-high-wood-chopper", "name": "Cable Standing Low To High Wood Chopper", "equipment": "cable"}, {"slug": "cable-standing-single-arm-chest-press", "name": "Cable Standing Single Arm Chest Press", "equipment": "cable"}, {"slug": "cable-supinating-row", "name": "Cable Supinating Row", "equipment": "cable"}, {"slug": "cable-wood-chopper", "name": "Cable Wood Chopper", "equipment": "cable"}, {"slug": "chin-ups", "name": "Chin Ups", "equipment": "bodyweight"}, {"slug": "decline-push-up", "name": "Decline Push Up", "equipment": "bodyweight"}, {"slug": "diamond-push-ups", "name": "Diamond Push Ups", "equipment": "bodyweight"}, {"slug": "dumbbell-alternating-forward-lunge", "name": "Dumbbell Alternating Forward Lunge", "equipment": "dumbbell"}, {"slug": "dumbbell-bench-press", "name": "Dumbbell Bench Press", "equipment": "dumbbell"}, {"slug": "dumbbell-bulgarian-split-squat", "name": "Dumbbell Bulgarian Split Squat", "equipment": "dumbbell"}, {"slug": "dumbbell-chest-fly", "name": "Dumbbell Chest Fly", "equipment": "dumbbell"}, {"slug": "dumbbell-concentration-curl", "name": "Dumbbell Concentration Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-cross-body-romanian-deadlift", "name": "Dumbbell Cross Body Romanian Deadlift", "equipment": "dumbbell"}, {"slug": "dumbbell-curl", "name": "Dumbbell Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-decline-bench-press", "name": "Dumbbell Decline Bench Press", "equipment": "dumbbell"}, {"slug": "dumbbell-decline-chest-fly", "name": "Dumbbell Decline Chest Fly", "equipment": "dumbbell"}, {"slug": "dumbbell-decline-skullcrusher", "name": "Dumbbell Decline Skullcrusher", "equipment": "dumbbell"}, {"slug": "dumbbell-feet-elevated-glute-bridge", "name": "Dumbbell Feet Elevated Glute Bridge", "equipment": "dumbbell"}, {"slug": "dumbbell-figure-four-heels-elevated-hip-thrust", "name": "Dumbbell Figure Four Heels Elevated Hip Thrust", "equipment": "dumbbell"}, {"slug": "dumbbell-front-raise", "name": "Dumbbell Front Raise", "equipment": "dumbbell"}, {"slug": "dumbbell-goblet-alternating-curtsy-lunge", "name": "Dumbbell Goblet Alternating Curtsy Lunge", "equipment": "dumbbell"}, {"slug": "dumbbell-goblet-bulgarian-split-squat", "name": "Dumbbell Goblet Bulgarian Split Squat", "equipment": "dumbbell"}, {"slug": "dumbbell-goblet-forward-lunge", "name": "Dumbbell Goblet Forward Lunge", "equipment": "dumbbell"}, {"slug": "dumbbell-goblet-reverse-lunge", "name": "Dumbbell Goblet Reverse Lunge", "equipment": "dumbbell"}, {"slug": "dumbbell-goblet-split-squat", "name": "Dumbbell Goblet Split Squat", "equipment": "dumbbell"}, {"slug": "dumbbell-goblet-squat", "name": "Dumbbell Goblet Squat", "equipment": "dumbbell"}, {"slug": "dumbbell-hammer-curl", "name": "Dumbbell Hammer Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-heels-elevated-hip-thrust", "name": "Dumbbell Heels Elevated Hip Thrust", "equipment": "dumbbell"}, {"slug": "dumbbell-incline-bench-press", "name": "Dumbbell Incline Bench Press", "equipment": "dumbbell"}, {"slug": "dumbbell-incline-chest-fly", "name": "Dumbbell Incline Chest Fly", "equipment": "dumbbell"}, {"slug": "dumbbell-incline-curl", "name": "Dumbbell Incline Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-incline-front-raise", "name": "Dumbbell Incline Front Raise", "equipment": "dumbbell"}, {"slug": "dumbbell-incline-hammer-curl", "name": "Dumbbell Incline Hammer Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-laying-reverse-fly", "name": "Dumbbell Laying Reverse Fly", "equipment": "dumbbell"}, {"slug": "dumbbell-leg-curl", "name": "Dumbbell Leg Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-preacher-curl", "name": "Dumbbell Preacher Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-rear-delt-fly", "name": "Dumbbell Rear Delt Fly", "equipment": "dumbbell"}, {"slug": "dumbbell-row-bilateral", "name": "Dumbbell Row Bilateral", "equipment": "dumbbell"}, {"slug": "dumbbell-row-unilateral", "name": "Dumbbell Row Unilateral", "equipment": "dumbbell"}, {"slug": "dumbbell-russian-twist", "name": "Dumbbell Russian Twist", "equipment": "dumbbell"}, {"slug": "dumbbell-seated-overhead-press", "name": "Dumbbell Seated Overhead Press", "equipment": "dumbbell"}, {"slug": "dumbbell-seated-overhead-tricep-extension", "name": "Dumbbell Seated Overhead Tricep Extension", "equipment": "dumbbell"}, {"slug": "dumbbell-seated-rear-delt-fly", "name": "Dumbbell Seated Rear Delt Fly", "equipment": "dumbbell"}, {"slug": "dumbbell-seated-shrug", "name": "Dumbbell Seated Shrug", "equipment": "dumbbell"}, {"slug": "dumbbell-shrug", "name": "Dumbbell Shrug", "equipment": "dumbbell"}, {"slug": "dumbbell-side-bend", "name": "Dumbbell Side Bend", "equipment": "dumbbell"}, {"slug": "dumbbell-single-arm-chest-press", "name": "Dumbbell Single Arm Chest Press", "equipment": "dumbbell"}, {"slug": "dumbbell-single-arm-clean-and-press", "name": "Dumbbell Single Arm Clean And Press", "equipment": "dumbbell"}, {"slug": "dumbbell-single-arm-row", "name": "Dumbbell Single Arm Row", "equipment": "dumbbell"}, {"slug": "dumbbell-single-leg-calf-raise", "name": "Dumbbell Single Leg Calf Raise", "equipment": "dumbbell"}, {"slug": "dumbbell-situp", "name": "Dumbbell Situp", "equipment": "dumbbell"}, {"slug": "dumbbell-skullcrusher", "name": "Dumbbell Skullcrusher", "equipment": "dumbbell"}, {"slug": "dumbbell-spinal-jefferson-curl", "name": "Dumbbell Spinal Jefferson Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-standing-single-arm-curl", "name": "Dumbbell Standing Single Arm Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-standing-single-arm-hammer-curl", "name": "Dumbbell Standing Single Arm Hammer Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-sumo-squat", "name": "Dumbbell Sumo Squat", "equipment": "dumbbell"}, {"slug": "dumbbell-superman", "name": "Dumbbell Superman", "equipment": "dumbbell"}, {"slug": "dumbbell-thruster", "name": "Dumbbell Thruster", "equipment": "dumbbell"}, {"slug": "dumbbell-tricep-kickback", "name": "Dumbbell Tricep Kickback", "equipment": "dumbbell"}, {"slug": "dumbbell-upright-row", "name": "Dumbbell Upright Row", "equipment": "dumbbell"}, {"slug": "dumbbell-wrist-curl", "name": "Dumbbell Wrist Curl", "equipment": "dumbbell"}, {"slug": "dumbbell-wrist-extension", "name": "Dumbbell Wrist Extension", "equipment": "dumbbell"}, {"slug": "elbow-side-plank", "name": "Elbow Side Plank", "equipment": "bodyweight"}, {"slug": "ez-bar-preacher-curl", "name": "EZ bar Preacher Curl", "equipment": "barbell"}, {"slug": "ez-bar-reverse-preacher-curl", "name": "EZ bar Reverse Preacher Curl", "equipment": "barbell"}, {"slug": "forward-lunge", "name": "Forward Lunge", "equipment": "bodyweight"}, {"slug": "good-mornings", "name": "Good Mornings", "equipment": "bodyweight"}, {"slug": "incline-push-up", "name": "Incline Push Up", "equipment": "bodyweight"}, {"slug": "inverted-row", "name": "Inverted Row", "equipment": "bodyweight"}, {"slug": "jump-squats", "name": "Jump Squats", "equipment": "bodyweight"}, {"slug": "kettlebell-alternating-curtsy-lunge", "name": "Kettlebell Alternating Curtsy Lunge", "equipment": "kettlebell"}, {"slug": "kettlebell-assisted-bulgarian-split-squat", "name": "Kettlebell Assisted Bulgarian Split Squat", "equipment": "kettlebell"}, {"slug": "kettlebell-bench-press", "name": "Kettlebell Bench Press", "equipment": "kettlebell"}, {"slug": "kettlebell-curl", "name": "Kettlebell Curl", "equipment": "kettlebell"}, {"slug": "kettlebell-farmers-carry", "name": "Kettlebell Farmers Carry", "equipment": "kettlebell"}, {"slug": "kettlebell-front-raise", "name": "Kettlebell Front Raise", "equipment": "kettlebell"}, {"slug": "kettlebell-goblet-curl", "name": "Kettlebell Goblet Curl", "equipment": "kettlebell"}, {"slug": "kettlebell-gorilla-row", "name": "Kettlebell Gorilla Row", "equipment": "kettlebell"}, {"slug": "kettlebell-incline-bench-press", "name": "Kettlebell Incline Bench Press", "equipment": "kettlebell"}, {"slug": "kettlebell-romanian-deadlift", "name": "Kettlebell Romanian Deadlift", "equipment": "kettlebell"}, {"slug": "kettlebell-row", "name": "Kettlebell Row", "equipment": "kettlebell"}, {"slug": "kettlebell-row-single", "name": "Kettlebell Row Single", "equipment": "kettlebell"}, {"slug": "kettlebell-seated-overhead-press", "name": "Kettlebell Seated Overhead Press", "equipment": "kettlebell"}, {"slug": "kettlebell-shrug", "name": "Kettlebell Shrug", "equipment": "kettlebell"}, {"slug": "kettlebell-single-arm-row", "name": "Kettlebell Single Arm Row", "equipment": "kettlebell"}, {"slug": "kettlebell-spinal-jefferson-curl", "name": "Kettlebell Spinal Jefferson Curl", "equipment": "kettlebell"}, {"slug": "kettlebell-sumo-deadlift", "name": "Kettlebell Sumo Deadlift", "equipment": "kettlebell"}, {"slug": "kettlebell-swing", "name": "Kettlebell Swing", "equipment": "kettlebell"}, {"slug": "kettlebell-thruster", "name": "Kettlebell Thruster", "equipment": "kettlebell"}, {"slug": "kettlebell-windmill", "name": "Kettlebell Windmill", "equipment": "kettlebell"}, {"slug": "landmine-t-bar-rows", "name": "Landmine T bar Rows", "equipment": "barbell"}, {"slug": "machine-45-degree-back-extension", "name": "Machine 45 Degree Back Extension", "equipment": "machine"}, {"slug": "machine-cable-v-bar-push-downs", "name": "Machine Cable V bar Push Downs", "equipment": "machine"}, {"slug": "machine-chest-press", "name": "Machine Chest Press", "equipment": "machine"}, {"slug": "machine-crunch", "name": "Machine Crunch", "equipment": "machine"}, {"slug": "machine-dips", "name": "Machine Dips", "equipment": "machine"}, {"slug": "machine-face-pulls", "name": "Machine Face Pulls", "equipment": "machine"}, {"slug": "machine-front-military-press", "name": "Machine Front Military Press", "equipment": "machine"}, {"slug": "machine-leg-extension", "name": "Machine Leg Extension", "equipment": "machine"}, {"slug": "machine-leg-press", "name": "Machine Leg Press", "equipment": "machine"}, {"slug": "machine-neutral-row", "name": "Machine Neutral Row", "equipment": "machine"}, {"slug": "machine-pec-fly", "name": "Machine Pec Fly", "equipment": "machine"}, {"slug": "machine-plate-loaded-leg-extension", "name": "Machine Plate Loaded Leg Extension", "equipment": "machine"}, {"slug": "machine-plate-loaded-t-bar-row", "name": "Machine Plate Loaded T bar Row", "equipment": "machine"}, {"slug": "machine-pulldown", "name": "Machine Pulldown", "equipment": "machine"}, {"slug": "machine-seated-cable-row", "name": "Machine Seated Cable Row", "equipment": "machine"}, {"slug": "machine-underhand-row", "name": "Machine Underhand Row", "equipment": "machine"}, {"slug": "mountain-climber", "name": "Mountain Climber", "equipment": "bodyweight"}, {"slug": "narrow-pulldown", "name": "Narrow Pulldown", "equipment": "bodyweight"}, {"slug": "plate-forward-lunge", "name": "Plate Forward Lunge", "equipment": "barbell"}, {"slug": "single-legged-romanian-deadlifts", "name": "Single Legged Romanian Deadlifts", "equipment": "bodyweight"}, {"slug": "smith-machine-close-grip-bench-press", "name": "Smith Machine Close Grip Bench Press", "equipment": "machine"}, {"slug": "smith-machine-incline-bench-press", "name": "Smith Machine Incline Bench Press", "equipment": "machine"}, {"slug": "smith-machine-standing-shrugs", "name": "Smith Machine Standing Shrugs", "equipment": "machine"}, {"slug": "smith-machine-sumo-romanian-deadlift", "name": "Smith Machine Sumo Romanian Deadlift", "equipment": "machine"}, {"slug": "supermans", "name": "Supermans", "equipment": "bodyweight"}, {"slug": "wall-sit", "name": "Wall Sit", "equipment": "bodyweight"}];

const MUSCLES = [
  "neck", "chest", "front_delts", "biceps", "forearms", "abs", "obliques",
  "adductors", "quads", "calves_front", "traps", "rear_delts", "lats",
  "triceps", "lower_back", "glutes", "hamstrings", "calves_back",
];

const EX = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug", "name", "category", "pattern", "equipment", "difficulty",
    "primary_muscle", "primary_muscles", "secondary_muscles", "tertiary_muscles",
    "cue", "cues", "mistakes", "why_matters", "setup", "progression", "regression",
  ],
  properties: {
    slug: { type: "string", description: "Kopiér VERBATIM fra input" },
    name: { type: "string", description: "Engelsk navn (som de eksisterende), pænt formateret" },
    category: { type: "string", enum: ["arms", "core", "full-body", "lower-body", "shoulders", "upper-body-pull", "upper-body-push"] },
    pattern: { type: "string", enum: ["squat", "hinge", "lunge", "push-horizontal", "push-vertical", "pull-horizontal", "pull-vertical", "core", "isolation", "carry"] },
    equipment: { type: "string", enum: ["barbell", "dumbbell", "cable", "kettlebell", "machine", "bodyweight", "band"] },
    difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
    primary_muscle: { type: "string", description: "Kort engelsk display-label, fx 'Chest' eller 'Quads'" },
    primary_muscles: { type: "array", items: { type: "string", enum: MUSCLES }, minItems: 1, maxItems: 3 },
    secondary_muscles: { type: "array", items: { type: "string", enum: MUSCLES }, maxItems: 4 },
    tertiary_muscles: { type: "array", items: { type: "string", enum: MUSCLES }, maxItems: 4 },
    cue: { type: "string", description: "Én dansk one-liner-cue" },
    cues: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6, description: "Danske coaching-cues, imperativ" },
    mistakes: {
      type: "array", minItems: 2, maxItems: 3,
      items: {
        type: "object", additionalProperties: false,
        required: ["title", "body"],
        properties: { title: { type: "string" }, body: { type: "string" } },
      },
    },
    why_matters: { type: "string", description: "Dansk, 1-2 sætninger" },
    setup: { type: "string", description: "Dansk, opstilling/udgangsposition" },
    progression: { type: "string", description: "Dansk, hårdere variant" },
    regression: { type: "string", description: "Dansk, lettere variant" },
  },
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["exercises"],
  properties: { exercises: { type: "array", items: EX } },
};

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function buildPrompt(batch) {
  return [
    "Du er strength-coach for MakeIt — en dansk online coaching-platform. Skriv struktureret øvelsesdata for følgende øvelser.",
    "",
    "STEMME: Direkte, kompetent, ingen fyld. Engelske øvelsesnavne, men ALT coaching-tekst (cue, cues, mistakes, why_matters, setup, progression, regression) på DANSK. Cues er imperative kommandoer. Se eksemplet.",
    "",
    "MUSKEL-TAXONOMI — brug KUN disse 18 slugs i muscle-arrays (intet andet):",
    MUSCLES.join(", "),
    "",
    "REGLER:",
    "- slug: kopiér verbatim fra input nedenfor.",
    "- equipment: brug den angivne værdi fra input.",
    "- primary_muscles = prime movers (1-3, stærkeste først). secondary = synergister. tertiary = stabilisatorer.",
    "- primary_muscle: kort engelsk label der opsummerer primary_muscles (fx 'Chest', 'Quads', 'Back/Hams').",
    "- Vær anatomisk korrekt. cues og mistakes skal vise den KORREKTE udførelse.",
    "- category/pattern/difficulty: vælg den bedst passende fra de tilladte enum-værdier.",
    "- 'isolation' pattern bruges til curls/raises/flyes/extensions. 'carry' til farmer's carries o.l.",
    "- Disse er DRAFT til coach-review — vær præcis, men du behøver ikke være perfekt.",
    "",
    "EKSEMPEL (eksisterende øvelse, format + stemme du skal matche):",
    JSON.stringify({
      slug: "back-squat", name: "Back Squat", category: "lower-body", pattern: "squat",
      equipment: "barbell", difficulty: "intermediate", primary_muscle: "Quads",
      primary_muscles: ["quads", "glutes"], secondary_muscles: ["hamstrings", "lower_back"],
      tertiary_muscles: ["abs", "adductors", "calves_back"],
      cue: "Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet.",
      cues: [
        "Bryst op og spændt mave før du drukner under baren.",
        "Knæ sporer tæerne — pres dem aktivt ud.",
        "Sid lavt: hofte under knæ.",
        "Driv gulvet væk og lås ud uden hyperextension.",
      ],
      mistakes: [
        { title: "Knæene falder ind", body: "Skubber kraften gennem inderlåret i stedet for glutes. Cue: pres knæene aktivt ud mod lilletåen." },
        { title: "Bryst kollapser frem", body: "Mister bar-position. Hold albuerne ind under baren og pres brystet op." },
      ],
      why_matters: "Bygger benstyrke fra bunden og tvinger hele kæden — core, ryg, hofte — til at arbejde samtidig.",
      setup: "Bar i high-bar position på øvre traps. Fødderne skulderbredde, lille udadrotation. Spændt mave før liften.",
      progression: "Tilføj pause i bunden, eller skift til front squat for mere quads.",
      regression: "Goblet squat med en kettlebell, eller box squat for dybdetilvænning.",
    }, null, 1),
    "",
    "ØVELSER DU SKAL GENERERE (" + batch.length + " stk):",
    JSON.stringify(batch),
    "",
    "Returnér ét objekt pr. øvelse i samme rækkefølge.",
  ].join("\n");
}

phase('Generér');
const batches = chunk(ITEMS, 10);
log(`${ITEMS.length} øvelser i ${batches.length} batches`);

const results = await parallel(
  batches.map((batch, bi) => () =>
    agent(buildPrompt(batch), { label: `batch-${bi + 1}/${batches.length}`, phase: 'Generér', schema: SCHEMA })
  )
);

const all = results.filter(Boolean).flatMap((r) => (r && r.exercises) || []);
log(`${all.length} øvelser genereret`);
return { count: all.length, exercises: all };
