/**
 * Demo-mode exercise library — the 20 v1 lifts from
 * supabase/seed-exercises.sql so /train/exercises/[slug] works
 * without Supabase. `demoAssetUrl` comes from bundledDemoAssetUrl:
 * slugs with files in public/exercise-demos/ get the public WebM
 * path; front-squat stays null (PhaseAnimator fallback).
 */
import { bundledDemoAssetUrl } from "@/lib/data/bundled-demo-assets";
import type { Exercise, ExercisePhase, ExerciseMistake } from "@/lib/data/exercises";
import type { MuscleGroup } from "@/lib/data/muscle-groups";

type MockDraft = {
  slug: string;
  name: string;
  category: string;
  pattern: string;
  equipment: string;
  difficulty: Exercise["difficulty"];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  tertiaryMuscles: MuscleGroup[];
  cues: string[];
  mistakes: ExerciseMistake[];
  whyMatters: string;
  setup: string;
  progression: string;
  regression: string;
  displayOrder: number;
  phases: ExercisePhase[];
};

function mock(draft: MockDraft): Exercise {
  return {
    id: `mock-${draft.slug}`,
    slug: draft.slug,
    name: draft.name,
    category: draft.category,
    pattern: draft.pattern,
    equipment: draft.equipment,
    difficulty: draft.difficulty,
    primaryMuscles: draft.primaryMuscles,
    secondaryMuscles: draft.secondaryMuscles,
    tertiaryMuscles: draft.tertiaryMuscles,
    cues: draft.cues,
    mistakes: draft.mistakes,
    whyMatters: draft.whyMatters,
    setup: draft.setup,
    progression: draft.progression,
    regression: draft.regression,
    demoAssetUrl: bundledDemoAssetUrl(draft.slug),
    videoUrl: null,
    thumbnailUrl: null,
    displayOrder: draft.displayOrder,
    isPublished: true,
    phases: draft.phases,
  };
}

export const MOCK_EXERCISES: Exercise[] = [
  mock({
    slug: "back-squat",
    name: "Back Squat",
    category: "lower-body",
    pattern: "squat",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "lower_back"],
    tertiaryMuscles: ["abs", "adductors", "calves_back"],
    cues: [
      "Bryst op og spændt mave før du drukner under baren.",
      "Knæ sporer tæerne — pres dem aktivt ud.",
      "Sid lavt: hofte under knæ.",
      "Driv gulvet væk og lås ud uden hyperextension.",
      "Træk vejret ind i bunden, pust ud på vej op.",
    ],
    mistakes: [
      {
        title: "Knæene falder ind",
        body: "Skubber kraften gennem inderlåret i stedet for at engagere glutes. Cue: pres knæene aktivt ud mod lillefingertåen.",
      },
      {
        title: "Bryst kollapser frem",
        body: "Mister bar-position. Hold albuerne ind under baren og pres brystet op — bagsiden skal være stiv.",
      },
      {
        title: "Hælen letter",
        body: "Vægten over fortæen. Sko med fast hæl + bevidst tryk i bagest tredjedel af foden.",
      },
    ],
    whyMatters:
      "Bygger benstyrke fra bunden og tvinger hele kæden — core, ryg, hofte — til at arbejde samtidig.",
    setup:
      "Bar i high-bar position på øvre traps. Fødderne skulderbredde, lille udadrotation. Spændt mave før liften.",
    progression:
      "Tilføj pause i bunden, eller skift til front squat for mere quads og oprejst torso.",
    regression: "Goblet squat med en kettlebell, eller box squat for at lære dybdetilvænning.",
    displayOrder: 10,
    phases: [
      {
        name: "Descent",
        duration_ms: 1500,
        primary: ["quads"],
        secondary: ["glutes", "hamstrings"],
        tertiary: ["adductors", "abs", "lower_back"],
      },
      {
        name: "Bund",
        duration_ms: 400,
        primary: ["quads", "glutes"],
        secondary: ["adductors", "hamstrings"],
        tertiary: ["lower_back", "abs"],
      },
      {
        name: "Drive",
        duration_ms: 1100,
        primary: ["glutes", "quads"],
        secondary: ["hamstrings", "lower_back"],
        tertiary: ["abs", "adductors", "calves_back"],
      },
    ],
  }),
  mock({
    slug: "front-squat",
    name: "Front Squat",
    category: "lower-body",
    pattern: "squat",
    equipment: "barbell",
    difficulty: "advanced",
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes", "abs"],
    tertiaryMuscles: ["lower_back", "calves_back", "adductors"],
    cues: [
      "Albuerne højt og pegende fremad — kollaberer de, kollaberer brystet.",
      "Torso lodret — ingen lean fremover.",
      "Knæene må gerne ride forbi tæerne.",
      "Mave hård som en murstensvæg gennem hele liften.",
      "Bunden lav — hofte under knæ uden hælen letter.",
    ],
    mistakes: [
      {
        title: "Albuerne falder",
        body: "Baren ruller af og forreste løft kollapser. Træn front-rack mobility — håndleds- og skulderfleksibilitet er forudsætningen.",
      },
      {
        title: "Fremoverlæn",
        body: "Den klassiske squat-tendens dræber front squat. Tænk plast under hagen og squat lodret ned.",
      },
    ],
    whyMatters:
      "Den mest quad-dominerende stang-øvelse vi har — bygger oprejst styrke og kræver brutal core.",
    setup:
      "Bar i front rack på forreste delts. Albuer høje. Stance lidt smallere end back squat.",
    progression: "Tempo (3 sek nedad + 2 sek pause i bund). Eller pause front squat.",
    regression: "Goblet squat eller zercher squat hvis front rack mobility er begrænset.",
    displayOrder: 20,
    phases: [
      {
        name: "Descent",
        duration_ms: 1400,
        primary: ["quads"],
        secondary: ["glutes", "abs"],
        tertiary: ["adductors", "lower_back"],
      },
      {
        name: "Bund",
        duration_ms: 400,
        primary: ["quads", "glutes"],
        secondary: ["abs", "adductors"],
        tertiary: ["lower_back", "calves_back"],
      },
      {
        name: "Drive",
        duration_ms: 1000,
        primary: ["quads"],
        secondary: ["glutes", "abs"],
        tertiary: ["adductors", "calves_back"],
      },
    ],
  }),
  mock({
    slug: "deadlift",
    name: "Conventional Deadlift",
    category: "full-body",
    pattern: "hinge",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["hamstrings", "glutes", "lower_back"],
    secondaryMuscles: ["lats", "traps", "quads"],
    tertiaryMuscles: ["forearms", "abs", "calves_back"],
    cues: [
      "Lats engageret — træk baren ind i kroppen, ikke væk fra den.",
      "Stang over midtfod ved opstart.",
      "Skuldre lige over baren — ikke bag.",
      "Pres gulvet væk, ikke træk baren op.",
      "Lås hofterne ud i toppen uden hyperextension.",
    ],
    mistakes: [
      {
        title: "Hofte skyder op først",
        body: "Du laver en stiff-leg pull med dårligt knæ-engagement. Cue: pres gulvet væk — knæ og hofte ekstenderer samtidig.",
      },
      {
        title: "Rygsænkning ved lockout",
        body: "Hofterne overstrækker bagud. Stop ved hip extension neutral — ingen lean back.",
      },
    ],
    whyMatters:
      "Den øvelse der bedst tester hele bagsiden — fra hælen til nakken. Bygger den styrke der overfører til alt.",
    setup:
      "Bar over midtfod. Skin tæt på baren. Grip lige uden for benene. Træk slæk ud af baren før liften.",
    progression: "Pause-deadlift 2 cm over gulv, eller deficit pull for ekstra range.",
    regression: "Trap bar deadlift eller block pull fra knæhøjde.",
    displayOrder: 30,
    phases: [
      {
        name: "Setup",
        duration_ms: 600,
        primary: ["lats"],
        secondary: ["hamstrings", "traps"],
        tertiary: ["forearms", "abs", "glutes"],
      },
      {
        name: "Floor break",
        duration_ms: 1300,
        primary: ["hamstrings", "glutes", "quads"],
        secondary: ["lower_back", "lats"],
        tertiary: ["forearms", "traps", "abs"],
      },
      {
        name: "Lockout",
        duration_ms: 1000,
        primary: ["glutes", "lower_back"],
        secondary: ["hamstrings", "traps"],
        tertiary: ["lats", "abs", "forearms"],
      },
    ],
  }),
  mock({
    slug: "rdl",
    name: "Romanian Deadlift",
    category: "lower-body",
    pattern: "hinge",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["lower_back", "lats"],
    tertiaryMuscles: ["forearms", "abs", "traps"],
    cues: [
      "Knæene let bøjede — låses ind i den vinkel.",
      "Hofterne tilbage, ikke ned. Stang skinger ned langs lår.",
      "Lats engageret — bar holdes tæt på kroppen.",
      "Stop når hamstrings siger stop — ikke når baren rammer gulv.",
      "Lås ved at presse hofterne fremad mod stangen.",
    ],
    mistakes: [
      {
        title: "Knæ bøjer for meget",
        body: "Bliver til en deadlift. Hold knævinklen konstant — det er hofte-bevægelse, ikke knæ-bevægelse.",
      },
      {
        title: "Baren glider fremad",
        body: "Hamstrings bliver inaktive. Tænk bar nøjagtig på låret — som om du skraber lårhårene væk.",
      },
    ],
    whyMatters:
      "Renest mulig hamstring og glute stimulus uden quads-dominans. Bygger den bagside back squat ikke kan ramme.",
    setup:
      "Stang i hip extension start. Stance let smallere end deadlift. Knæ let bøjede og fastlåst.",
    progression: "Single-leg RDL eller deficit (stå på en plate).",
    regression: "Dumbbell RDL for nemmere bar path.",
    displayOrder: 40,
    phases: [
      {
        name: "Descent",
        duration_ms: 1800,
        primary: ["hamstrings"],
        secondary: ["glutes", "lower_back"],
        tertiary: ["lats", "forearms"],
      },
      {
        name: "Stretch",
        duration_ms: 400,
        primary: ["hamstrings", "glutes"],
        secondary: ["lower_back"],
        tertiary: ["lats", "forearms"],
      },
      {
        name: "Drive",
        duration_ms: 900,
        primary: ["glutes", "hamstrings"],
        secondary: ["lower_back"],
        tertiary: ["lats", "traps", "forearms"],
      },
    ],
  }),
  mock({
    slug: "bench",
    name: "Bench Press",
    category: "upper-body-push",
    pattern: "push-horizontal",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["chest", "front_delts", "triceps"],
    secondaryMuscles: ["forearms"],
    tertiaryMuscles: ["abs", "lats"],
    cues: [
      "Skuldre tilbage og ned — pres dem ind i bænken.",
      "Ben i gulvet, hofte aktiv — bench er en helkrops-øvelse.",
      "Baren ned til midten af brystet, albuer omkring 45° ud.",
      "Pust ud på vej op, hold core spændt hele vejen.",
      "Lås albuerne uden at miste skulder-position.",
    ],
    mistakes: [
      {
        title: "Albuerne flagrer 90° ud",
        body: "Skader skulderen og fjerner triceps engagement. Hold 45° vinkel mellem overarm og torso.",
      },
      {
        title: "Bagdel forlader bænk",
        body: "Cheats range of motion. Hofte skal røre bænken hele liften.",
      },
    ],
    whyMatters:
      "Hovedøvelse for bryststyrke og overkrops-push. Mest brugte målestok for overkropskraft.",
    setup:
      "Skulderblade tilbage og ned. Bro i ryggen ok. Fødderne plantet. Grip ca. ringfinger på bar-ringen.",
    progression: "Paused bench eller tempo bench (3 sek nedad).",
    regression: "Dumbbell bench eller floor press hvis skulder-fleksibilitet er begrænset.",
    displayOrder: 50,
    phases: [
      {
        name: "Descent",
        duration_ms: 1400,
        primary: ["chest"],
        secondary: ["front_delts", "triceps"],
        tertiary: ["lats", "forearms"],
      },
      {
        name: "Touch",
        duration_ms: 300,
        primary: ["chest", "front_delts"],
        secondary: ["triceps"],
        tertiary: ["lats", "forearms", "abs"],
      },
      {
        name: "Drive",
        duration_ms: 1000,
        primary: ["chest", "triceps"],
        secondary: ["front_delts"],
        tertiary: ["forearms", "lats"],
      },
    ],
  }),
  mock({
    slug: "paused-bench",
    name: "Paused Bench",
    category: "upper-body-push",
    pattern: "push-horizontal",
    equipment: "barbell",
    difficulty: "advanced",
    primaryMuscles: ["chest", "front_delts", "triceps"],
    secondaryMuscles: ["forearms"],
    tertiaryMuscles: ["abs", "lats"],
    cues: [
      "Pause 1-2 sekunder med bar rørende brystet.",
      "Bevar al spænding i pausen — slap aldrig af.",
      "Eksplosiv koncentrisk lige efter pausen.",
      "Albuer og scapula låst hele vejen.",
      "Pust først ud efter low-mid point.",
    ],
    mistakes: [
      {
        title: "Bouncer ud af pausen",
        body: "Eliminerer hele pointen. Markér pausen visuelt — coachen tæller højt, eller læg en chip på brystet.",
      },
      {
        title: "Slapper af i pausen",
        body: "Mister al lagret elastisk energi. Hold core og lats spændte under hele pausen.",
      },
    ],
    whyMatters:
      "Bygger bottom-end bench power og fjerner stretch-reflex-snyderi. Bedste raw strength carryover.",
    setup: "Som bench press. Pause-tæller eller chip på brystet.",
    progression: "Long pause (3 sek+) eller weight increase.",
    regression: "Standard bench med touch-and-go, eller pin press.",
    displayOrder: 60,
    phases: [
      {
        name: "Descent",
        duration_ms: 1500,
        primary: ["chest"],
        secondary: ["front_delts", "triceps"],
        tertiary: ["lats", "forearms"],
      },
      {
        name: "Pause",
        duration_ms: 1000,
        primary: ["chest", "front_delts"],
        secondary: ["triceps"],
        tertiary: ["lats", "abs", "forearms"],
      },
      {
        name: "Drive",
        duration_ms: 1100,
        primary: ["chest", "triceps"],
        secondary: ["front_delts"],
        tertiary: ["forearms", "lats"],
      },
    ],
  }),
  mock({
    slug: "ohp",
    name: "Overhead Press",
    category: "shoulders",
    pattern: "push-vertical",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["front_delts", "triceps"],
    secondaryMuscles: ["chest", "traps"],
    tertiaryMuscles: ["abs", "forearms"],
    cues: [
      "Stang i front rack — albuer let foran baren.",
      "Spændt mave og glutes — som en stående plank.",
      "Træk hovedet tilbage så baren passerer ansigt.",
      "Stang ender direkte over midtfod, ikke fremover.",
      "Ingen ben-drive — strict pres hele vejen.",
    ],
    mistakes: [
      {
        title: "Ryglæn",
        body: "Bench press på gulv — fjerner OHP intentet. Hold core spændt og torso lodret.",
      },
      {
        title: "Stang ender fremover",
        body: "Lockout-position over panden i stedet for over midtfod. Træk haglen ind og pres op + bagover så bar finder linjen.",
      },
    ],
    whyMatters:
      "Den øvelse der bedst tester core-stabilitet under load. Bygger skulder-styrke og total kæde-stivhed.",
    setup: "Bar i front rack. Stance omkring hofte. Mave hård. Albuer let foran baren.",
    progression: "Push press hvis lockout-styrken er der, eller seated OHP for ren skulder-load.",
    regression: "Dumbbell shoulder press eller seated barbell press.",
    displayOrder: 70,
    phases: [
      {
        name: "Pres start",
        duration_ms: 900,
        primary: ["front_delts"],
        secondary: ["triceps", "chest"],
        tertiary: ["abs", "traps"],
      },
      {
        name: "Mid-range",
        duration_ms: 900,
        primary: ["front_delts", "triceps"],
        secondary: ["traps"],
        tertiary: ["abs", "chest", "forearms"],
      },
      {
        name: "Lockout",
        duration_ms: 700,
        primary: ["triceps", "traps"],
        secondary: ["front_delts"],
        tertiary: ["abs", "forearms"],
      },
    ],
  }),
  mock({
    slug: "push-press",
    name: "Push Press",
    category: "shoulders",
    pattern: "push-vertical",
    equipment: "barbell",
    difficulty: "advanced",
    primaryMuscles: ["front_delts", "triceps"],
    secondaryMuscles: ["chest", "traps", "quads", "glutes"],
    tertiaryMuscles: ["abs", "forearms", "calves_back"],
    cues: [
      "Dip lille — knæ blødt, ikke et squat.",
      "Drive eksplosivt fra benene op gennem stangen.",
      "Hovedet trækkes tilbage så baren passerer ansigt.",
      "Lås benene FØR du låser armene over hovedet.",
      "Stang ender direkte over midtfoden, ikke fremover.",
    ],
    mistakes: [
      {
        title: "For dybt dip",
        body: "Bliver til en thruster. Dip skal være 5-10 cm — knæene må aldrig forbi 30°.",
      },
      {
        title: "Forward lean",
        body: "Bar går fremover og du mister lockout. Hold torso lodret i hele dippet.",
      },
    ],
    whyMatters:
      "Lærer dig at producere helkrops kraft op gennem en kæde. Stærkeste overhead-øvelse for de fleste.",
    setup: "Bar i front rack. Stance omkring hofte. Albuerne let foran baren.",
    progression: "Push jerk (split eller squat catch) når lockout-styrken er der.",
    regression: "Strict overhead press for at bygge bremsen først.",
    displayOrder: 80,
    phases: [
      {
        name: "Dip",
        duration_ms: 500,
        primary: ["quads"],
        secondary: ["glutes", "abs"],
        tertiary: ["calves_back", "front_delts"],
      },
      {
        name: "Drive",
        duration_ms: 500,
        primary: ["quads", "glutes"],
        secondary: ["calves_back", "front_delts"],
        tertiary: ["abs", "triceps"],
      },
      {
        name: "Press",
        duration_ms: 1000,
        primary: ["front_delts", "triceps"],
        secondary: ["chest", "traps"],
        tertiary: ["abs", "forearms"],
      },
      {
        name: "Lockout",
        duration_ms: 700,
        primary: ["triceps", "traps"],
        secondary: ["front_delts"],
        tertiary: ["abs", "forearms"],
      },
    ],
  }),
  mock({
    slug: "pull-up",
    name: "Pull-up",
    category: "upper-body-pull",
    pattern: "pull-vertical",
    equipment: "bodyweight",
    difficulty: "intermediate",
    primaryMuscles: ["lats", "biceps"],
    secondaryMuscles: ["rear_delts", "forearms"],
    tertiaryMuscles: ["traps", "abs"],
    cues: [
      "Hænge fuld stræk i bunden — ingen genvej.",
      "Træk albuerne ned mod hofterne, ikke op.",
      "Bryst hen til baren, ikke hagen.",
      "Skulderblade engageret før armene begynder at trække.",
      "Kontrolleret nedad — eccentric tæller dobbelt.",
    ],
    mistakes: [
      {
        title: "Kipping på styrketræning",
        body: "Cheat-rep. Hvis du laver pull-ups for at bygge styrke, eliminer al hofte-sving.",
      },
      {
        title: "Halv range",
        body: "Stop ikke ved hagen — bryst skal røre baren. Halv-pull = halv adaptation.",
      },
    ],
    whyMatters:
      "Den øvelse der bedst tester relativ overkrops-styrke. Lats, rygkraft og greb på én gang.",
    setup: "Bar i greb-bredde lidt udenfor skuldre. Pronated grip (overhand). Spændt core.",
    progression: "Weighted pull-up via dipping belt, eller L-sit pull-up.",
    regression: "Negativ-only (kun nedad), eller assisted med band.",
    displayOrder: 90,
    phases: [
      {
        name: "Hang",
        duration_ms: 600,
        primary: ["lats"],
        secondary: ["forearms"],
        tertiary: ["abs", "traps"],
      },
      {
        name: "Træk",
        duration_ms: 1500,
        primary: ["lats", "biceps"],
        secondary: ["forearms", "rear_delts"],
        tertiary: ["abs", "traps"],
      },
      {
        name: "Top",
        duration_ms: 500,
        primary: ["lats", "rear_delts"],
        secondary: ["biceps", "traps"],
        tertiary: ["forearms", "abs"],
      },
    ],
  }),
  mock({
    slug: "row",
    name: "Barbell Row",
    category: "upper-body-pull",
    pattern: "pull-horizontal",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["lats", "rear_delts"],
    secondaryMuscles: ["biceps", "traps"],
    tertiaryMuscles: ["forearms", "lower_back", "abs"],
    cues: [
      "Hofte fast — kun overkrop bevæger sig.",
      "Ryggen flad — ingen lordose eller kyfose.",
      "Træk til nedre bryst, ikke navlen.",
      "Albuerne pegende lige bagud, ikke ud til siden.",
      "Pause kort i toppen før kontrolleret nedad.",
    ],
    mistakes: [
      {
        title: "Hoftesving (kipping row)",
        body: "Mister al upper-back stimulus. Hold over-krops vinklen konstant — kun arme og scapula bevæger sig.",
      },
      {
        title: "Ryg-rund i bunden",
        body: "Skader nedre ryg. Hold neutral wirbelsøjle og let spændt mave hele tiden.",
      },
    ],
    whyMatters:
      "Horisontal-træk-king. Bygger den back thickness pull-ups ikke kan ramme, og balancerer bench-volumen.",
    setup:
      "Hængende ved hoftehøjde. Knæ let bøjede. Skulderblade trukket sammen før første træk.",
    progression: "Pendlay row (fra dødt på hvert rep) eller deficit row med plates.",
    regression: "Chest-supported row eller seated cable row.",
    displayOrder: 100,
    phases: [
      {
        name: "Pull",
        duration_ms: 1000,
        primary: ["lats", "rear_delts"],
        secondary: ["biceps", "forearms"],
        tertiary: ["traps", "lower_back"],
      },
      {
        name: "Squeeze",
        duration_ms: 400,
        primary: ["lats", "rear_delts", "traps"],
        secondary: ["biceps"],
        tertiary: ["forearms", "lower_back"],
      },
      {
        name: "Return",
        duration_ms: 1100,
        primary: ["lats"],
        secondary: ["rear_delts", "forearms"],
        tertiary: ["biceps", "lower_back"],
      },
    ],
  }),
  mock({
    slug: "lunge",
    name: "Walking Lunge",
    category: "lower-body",
    pattern: "lunge",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "adductors"],
    tertiaryMuscles: ["abs", "calves_back", "lower_back"],
    cues: [
      "Lange skridt — bagerste knæ må aldrig touch gulvet i high tempo set.",
      "Lodret torso — ingen fremoverlæn.",
      "Tryk fra hælen på forreste fod.",
      "Forreste knæ over (ikke forbi) ankel.",
      "Smooth overgang mellem hvert skridt — ingen pause.",
    ],
    mistakes: [
      {
        title: "For korte skridt",
        body: "Knæet ryger forbi tæerne og quads tager kontant. Tag længere skridt for at fordele load.",
      },
      {
        title: "Torso falder fremover",
        body: "Aktiverer lænd i stedet for benene. Hold brystet højt — som om en streng trækker dig op fra issen.",
      },
    ],
    whyMatters:
      "Unilateral ben-træning. Fanger hvor venstre/højre er ude af balance og bygger funktionel single-leg styrke.",
    setup:
      "Bar i back-squat position eller dumbbells i hænderne. Lang gangbane — minimum 8-10 meter.",
    progression: "Reverse lunge med pause i bunden, eller bulgarian split squat.",
    regression: "Static split squat uden vandring.",
    displayOrder: 110,
    phases: [
      {
        name: "Descent",
        duration_ms: 1200,
        primary: ["quads"],
        secondary: ["glutes", "hamstrings"],
        tertiary: ["adductors", "abs", "calves_back"],
      },
      {
        name: "Bottom",
        duration_ms: 300,
        primary: ["quads", "glutes"],
        secondary: ["adductors", "hamstrings"],
        tertiary: ["abs", "calves_back"],
      },
      {
        name: "Drive",
        duration_ms: 1000,
        primary: ["glutes", "quads"],
        secondary: ["hamstrings", "adductors"],
        tertiary: ["abs", "calves_back"],
      },
    ],
  }),
  mock({
    slug: "khr",
    name: "Hanging Knee Raise",
    category: "core",
    pattern: "core",
    equipment: "bodyweight",
    difficulty: "beginner",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["obliques"],
    tertiaryMuscles: ["forearms"],
    cues: [
      "Kontrolleret tempo — 2 sek op, 2 sek ned.",
      "Ingen sving — start fra full dead hang.",
      "Træk knæ til bryst, ikke til hofte.",
      "Hold pause i toppen før eccentric.",
      "Pust ud på vej op, ind på vej ned.",
    ],
    mistakes: [
      {
        title: "Momentum",
        body: "Du svinger benene op. Test: kan du pause i toppen 1 sekund? Hvis nej — slow it down.",
      },
      {
        title: "Halv range",
        body: "Knæene når kun til hofte. Sigt mod bryst-niveau — det er hvor abs faktisk skal arbejde.",
      },
    ],
    whyMatters:
      "Bygger funktionel core-styrke der direkte overfører til squat, deadlift og OHP — alt hvor du skal holde spænding.",
    setup: "Hænge fra pull-up bar. Spændt core fra start. Skulderblade ikke fuldt slap.",
    progression: "Hanging leg raise (straight legs) eller toes-to-bar.",
    regression: "Knee raise på captain's chair eller dipping bars.",
    displayOrder: 120,
    phases: [
      {
        name: "Lift",
        duration_ms: 800,
        primary: ["abs"],
        secondary: ["obliques", "forearms"],
        tertiary: [],
      },
      {
        name: "Top",
        duration_ms: 400,
        primary: ["abs", "obliques"],
        secondary: ["forearms"],
        tertiary: [],
      },
      {
        name: "Lower",
        duration_ms: 1100,
        primary: ["abs"],
        secondary: ["forearms"],
        tertiary: ["obliques"],
      },
    ],
  }),
  mock({
    slug: "hip-thrust",
    name: "Hip Thrust",
    category: "lower-body",
    pattern: "hinge",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings", "abs"],
    tertiaryMuscles: ["quads", "lower_back"],
    cues: [
      "Skulderblade ind på bænk, øjne på loft i toppen.",
      "Hagen ned mod bryst — ingen hovedhyperextension.",
      "Pres knæene let udad gennem hele liften.",
      "Lås hofterne — bækken neutral i toppen, ingen overstrækning.",
      "1-2 sek pause i toppen før kontrolleret nedad.",
    ],
    mistakes: [
      {
        title: "Hyperextension i toppen",
        body: "Lænden tager over for glutes. Pres hagen mod brystet og spænd maven i toppen — bækken skal være neutral.",
      },
      {
        title: "Fødderne for tæt på krop",
        body: "Bliver et quad-dominant pres. Fødder skal være længere ude så skinneben er lodret i lockout.",
      },
    ],
    whyMatters:
      "Den øvelse der rammer glutes hårdest — uden den ryg- og knæ-stress squat og deadlift har.",
    setup:
      "Skulderbladene mod en bænk. Bar over hoftekam med en pad. Fødderne plantet hofte-brede.",
    progression: "Single-leg hip thrust eller pause hip thrust.",
    regression: "Glute bridge på gulv uden bænk eller barbell.",
    displayOrder: 130,
    phases: [
      {
        name: "Drive",
        duration_ms: 900,
        primary: ["glutes"],
        secondary: ["hamstrings", "quads"],
        tertiary: ["abs"],
      },
      {
        name: "Lockout",
        duration_ms: 700,
        primary: ["glutes"],
        secondary: ["abs", "hamstrings"],
        tertiary: ["quads", "lower_back"],
      },
      {
        name: "Descent",
        duration_ms: 1100,
        primary: ["glutes"],
        secondary: ["hamstrings"],
        tertiary: ["quads", "abs"],
      },
    ],
  }),
  mock({
    slug: "push-up",
    name: "Push-up",
    category: "upper-body-push",
    pattern: "push-horizontal",
    equipment: "bodyweight",
    difficulty: "beginner",
    primaryMuscles: ["chest", "triceps", "front_delts"],
    secondaryMuscles: ["abs"],
    tertiaryMuscles: ["forearms", "glutes", "quads"],
    cues: [
      "Krop ret som en planke fra ankel til top af hovedet.",
      "Hænder under skuldre, fingre pegende frem.",
      "Albuer omkring 45° ud, ikke 90°.",
      "Bryst rører gulvet før du presser op.",
      "Spændt mave og glutes hele tiden — ingen hængerøv.",
    ],
    mistakes: [
      {
        title: "Hofte falder",
        body: "Plank-formen kollapser. Spænd glutes og abs FØR du starter.",
      },
      {
        title: "Halv range",
        body: "Mange laver kun øvre 30%. Bryst rører gulv eller det tæller ikke.",
      },
    ],
    whyMatters:
      "Den portable push-øvelse. Bygger functional pushing strength og core-stabilitet på én gang.",
    setup: "Hænder under skuldre. Tæer på gulv. Krop spændt fra hæl til hoved.",
    progression: "Decline push-up (fødder hævet), diamond push-up eller archer push-up.",
    regression: "Knee push-up eller incline (hænder på bænk).",
    displayOrder: 140,
    phases: [
      {
        name: "Descent",
        duration_ms: 1100,
        primary: ["chest"],
        secondary: ["front_delts", "triceps"],
        tertiary: ["abs", "forearms"],
      },
      {
        name: "Bottom",
        duration_ms: 300,
        primary: ["chest", "front_delts"],
        secondary: ["triceps"],
        tertiary: ["abs"],
      },
      {
        name: "Drive",
        duration_ms: 900,
        primary: ["chest", "triceps"],
        secondary: ["front_delts"],
        tertiary: ["abs", "forearms"],
      },
    ],
  }),
  mock({
    slug: "dip",
    name: "Dip",
    category: "upper-body-push",
    pattern: "push-vertical",
    equipment: "bodyweight",
    difficulty: "intermediate",
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["front_delts"],
    tertiaryMuscles: ["forearms", "abs"],
    cues: [
      "Skuldre nede fra ørerne — ikke shruggede.",
      "Krop let leaned forward = bryst-fokus, lodret = triceps-fokus.",
      "Albuerne 45° ud (bryst) eller tæt på krop (triceps).",
      "Albuer ned til 90°, ikke dybere — skulder-sikkerhed.",
      "Lås ud fuldt uden at miste skulderposition.",
    ],
    mistakes: [
      {
        title: "Shruggede skuldre",
        body: "Truer rotator-manchet. Træk skuldrene ned og hold der hele tiden.",
      },
      {
        title: "For dyb dip",
        body: "Albuer under 90° lægger pres på rotator cuff. Stop ved albuerne i ret vinkel.",
      },
    ],
    whyMatters:
      "Den eneste lodrette push der rammer både bryst og triceps tungt — og kræver intet andet end to barer.",
    setup:
      "Parallelbars eller dipping station. Krop fri af gulvet, ben krydset bagud eller lige ned.",
    progression: "Weighted dip via dipping belt.",
    regression: "Bench dip eller assisted dip med band.",
    displayOrder: 150,
    phases: [
      {
        name: "Descent",
        duration_ms: 1200,
        primary: ["chest"],
        secondary: ["front_delts", "triceps"],
        tertiary: ["abs", "forearms"],
      },
      {
        name: "Bottom",
        duration_ms: 300,
        primary: ["chest", "triceps"],
        secondary: ["front_delts"],
        tertiary: ["abs"],
      },
      {
        name: "Drive",
        duration_ms: 1000,
        primary: ["chest", "triceps"],
        secondary: ["front_delts"],
        tertiary: ["forearms", "abs"],
      },
    ],
  }),
  mock({
    slug: "plank",
    name: "Plank",
    category: "core",
    pattern: "core",
    equipment: "bodyweight",
    difficulty: "beginner",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["obliques", "lower_back"],
    tertiaryMuscles: ["glutes", "front_delts"],
    cues: [
      "Albuer under skuldre, underarme parallelt.",
      "Krop ret linje — hofte hverken oppe eller ned.",
      "Spændt mave som om du venter på et slag.",
      "Glutes spændt hårdt — fjerner load fra lænden.",
      "Træk hagen let ind — ingen kink i nakken.",
    ],
    mistakes: [
      {
        title: "Hofte synker",
        body: "Lænden overtager. Cue: tryk gulvet væk med underarmene og spænd glutes som om du holder en mønt mellem dem.",
      },
      {
        title: "Numse op i luften",
        body: "Bliver til en let down-dog. Hold hofteleddet i ret linje med skuldre.",
      },
    ],
    whyMatters:
      "Bygger isometrisk core-styrke der oversættes til alle store løft. Plank-time forudser deadlift-stabilitet.",
    setup: "Underarme på gulv, tæer plantet. Spændt mave fra start. Stopur klar.",
    progression: "Side plank, plank med arm-løft eller weighted plank.",
    regression: "Knee plank eller underarme på en bænk for mindre vinkel.",
    displayOrder: 160,
    phases: [
      {
        name: "Tidlig hold",
        duration_ms: 1800,
        primary: ["abs"],
        secondary: ["obliques"],
        tertiary: ["lower_back", "glutes"],
      },
      {
        name: "Udholdenhed",
        duration_ms: 1800,
        primary: ["abs"],
        secondary: ["obliques", "lower_back", "glutes"],
        tertiary: ["front_delts"],
      },
    ],
  }),
  mock({
    slug: "barbell-curl",
    name: "Barbell Curl",
    category: "arms",
    pattern: "pull-vertical",
    equipment: "barbell",
    difficulty: "beginner",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    tertiaryMuscles: ["front_delts"],
    cues: [
      "Albuerne LÅSER ved siden — de bevæger sig ikke en cm.",
      "Stang fra fuld stræk til hage-højde.",
      "Pause kort i toppen, squeeze biceps.",
      "Kontrolleret nedad — 2 sek minimum.",
      "Ingen body sway, ingen back arch.",
    ],
    mistakes: [
      {
        title: "Body english",
        body: "Du svinger med kroppen for at flytte stangen. Stå op mod en væg hvis du ikke kan disciplinere bevægelsen.",
      },
      {
        title: "Albuer flytter sig fremover",
        body: "Front delts tager over. Hold albuerne fast ved siden — som om de er limede til ribbene.",
      },
    ],
    whyMatters: "Isolerer biceps direkte. Mest effektive måde at bygge arm-størrelse på.",
    setup: "Stå oprejst. Stang i underhåndsgreb, skulder-bredde. Albuer fast ved siden.",
    progression: "Tempo curl (4 sek nedad) eller drag curl.",
    regression: "Dumbbell curl eller cable curl for constant tension.",
    displayOrder: 170,
    phases: [
      {
        name: "Drive",
        duration_ms: 700,
        primary: ["biceps"],
        secondary: ["forearms"],
        tertiary: ["front_delts"],
      },
      {
        name: "Squeeze",
        duration_ms: 500,
        primary: ["biceps"],
        secondary: ["forearms"],
        tertiary: [],
      },
      {
        name: "Eccentric",
        duration_ms: 1100,
        primary: ["biceps"],
        secondary: ["forearms"],
        tertiary: ["front_delts"],
      },
    ],
  }),
  mock({
    slug: "tricep-pushdown",
    name: "Tricep Pushdown",
    category: "arms",
    pattern: "push-vertical",
    equipment: "cable",
    difficulty: "beginner",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["forearms"],
    tertiaryMuscles: ["chest", "lats"],
    cues: [
      "Albuerne LÅSER ved siden — de bevæger sig ikke.",
      "Start fra 90° i albuen, pres ned til fuld stræk.",
      "Lock-out i bunden — squeeze 1 sek.",
      "Kontrolleret nedad eccentric — 2 sek.",
      "Lats spændt for at låse albue-position.",
    ],
    mistakes: [
      {
        title: "Albuer vandrer fremover",
        body: "Front delt tager over. Cue: albuer mod ribbenene hele tiden.",
      },
      {
        title: "Brug af kropsvægt",
        body: "Du bøjer dig fremover og smider vægten ned. Stå oprejst — stangens vægt skal bevæges af triceps alene.",
      },
    ],
    whyMatters:
      "Isolerer triceps — bygger lockout-styrken der overfører til bench og overhead press.",
    setup:
      "Cable maskine med rope eller V-bar. Stå oprejst tæt på maskine. Albuer fast ved siden.",
    progression: "Rope pushdown med spread i bunden, eller single-arm pushdown.",
    regression: "Lighter weight + tempo, eller seated overhead tricep extension.",
    displayOrder: 180,
    phases: [
      {
        name: "Pres",
        duration_ms: 700,
        primary: ["triceps"],
        secondary: ["forearms"],
        tertiary: ["lats"],
      },
      {
        name: "Lockout",
        duration_ms: 400,
        primary: ["triceps"],
        secondary: ["forearms"],
        tertiary: ["lats"],
      },
      {
        name: "Return",
        duration_ms: 900,
        primary: ["triceps"],
        secondary: ["forearms"],
        tertiary: ["lats"],
      },
    ],
  }),
  mock({
    slug: "lateral-raise",
    name: "Lateral Raise",
    category: "shoulders",
    pattern: "push-vertical",
    equipment: "dumbbell",
    difficulty: "beginner",
    primaryMuscles: ["front_delts"],
    secondaryMuscles: ["traps", "rear_delts"],
    tertiaryMuscles: ["forearms"],
    cues: [
      "Albuer let bøjede — hold den vinkel konstant.",
      "Hæv til skulderhøjde, ikke højere.",
      "Førerkant er lillefingeren, ikke tommelfinger.",
      "Kontrolleret tempo — ingen swing.",
      "Pause kort i toppen, kontrolleret ned.",
    ],
    mistakes: [
      {
        title: "Sving fra hoften",
        body: "Bygger ikke skuldre. Stå mod en væg hvis du ikke kan disciplinere bevægelsen.",
      },
      {
        title: "Tommelfinger i toppen pegende op",
        body: "Aktiverer front delts. Hold lillefinger højere end tommel — det targeterer side delt.",
      },
    ],
    whyMatters: "Eneste isolerede øvelse for side-delts. Bygger skulder-bredde og 3D look.",
    setup: "Stå oprejst med dumbbells ved siden. Albuer let bøjede. Spændt mave.",
    progression: "Cable lateral raise eller lean-away lateral (for stretch).",
    regression: "Machine lateral eller liggende lateral på en skrå bænk.",
    displayOrder: 190,
    phases: [
      {
        name: "Drive",
        duration_ms: 700,
        primary: ["front_delts"],
        secondary: ["traps"],
        tertiary: ["forearms"],
      },
      {
        name: "Top",
        duration_ms: 400,
        primary: ["front_delts", "traps"],
        secondary: ["rear_delts"],
        tertiary: ["forearms"],
      },
      {
        name: "Eccentric",
        duration_ms: 900,
        primary: ["front_delts"],
        secondary: ["traps"],
        tertiary: ["forearms"],
      },
    ],
  }),
  mock({
    slug: "standing-calf-raise",
    name: "Standing Calf Raise",
    category: "lower-body",
    pattern: "push-vertical",
    equipment: "machine",
    difficulty: "beginner",
    primaryMuscles: ["calves_back"],
    secondaryMuscles: ["calves_front"],
    tertiaryMuscles: ["glutes", "abs"],
    cues: [
      "Fuld stræk i bunden — strækkes, mærkes.",
      "Hæv på storetåballen, ikke yderkant.",
      "Pause 1-2 sek i top — squeeze.",
      "Lige knæ — ingen bouncing eller bøjning.",
      "Kontrolleret nedad — 2 sek.",
    ],
    mistakes: [
      {
        title: "Halv range",
        body: "Hæver kun 5 cm. Calves har enorm range — brug den eller drop øvelsen.",
      },
      {
        title: "Bouncing",
        body: "Stretch-reflex gør al arbejdet. Pause i top OG bund af hver rep.",
      },
    ],
    whyMatters:
      "Calves vokser kun fra direkte stimulus og full range. Skipper du dem, ser bens udvikling underligt ud.",
    setup: "Standing calf raise machine. Skulder under pad. Fortæer på platform, hæl frit.",
    progression: "Single-leg calf raise eller weight increase.",
    regression: "Bodyweight calf raise på et trin.",
    displayOrder: 200,
    phases: [
      {
        name: "Drive",
        duration_ms: 500,
        primary: ["calves_back"],
        secondary: ["calves_front"],
        tertiary: ["glutes"],
      },
      {
        name: "Top",
        duration_ms: 500,
        primary: ["calves_back"],
        secondary: ["calves_front"],
        tertiary: ["abs"],
      },
      {
        name: "Eccentric",
        duration_ms: 1100,
        primary: ["calves_back"],
        secondary: ["calves_front"],
        tertiary: ["glutes"],
      },
    ],
  }),
];
