---
name: landing-motion
description: Bevægelse og effekter på MakeIt-landingen (hero, scroll-drevne sektioner, galleri, stablede kort, magnetiske knapper, billedsekvenser). Brug når Tom sender inspiration (video, link, screenshots) eller beder om nye effekter på landingssiden eller andre marketingflader.
---

# Landing motion

Formålet er at omsætte inspiration til effekter på `components/marketing/landing/` uden at bryde designsystemet eller gates. Vi kopierer aldrig et design. Vi genbruger teknikker med husets byggeklodser.

Læs altid først:

1. `docs/LANDING_MOTION.md`: byggeklodserne der findes, og hvordan de virker.
2. `DESIGN.md`: især Temaer (den tilladte undtagelse for mørke blokke på landingen), Bevægelse og Gates.
3. `AGENTS.md`: Next.js-versionen afviger fra træningsdata. Læs `node_modules/next/dist/docs/` før du skriver kode, der rører Next-API'er.

Svar Tom på dansk. Ingen semikoloner og ingen tankestreger i prosa. Kode og kodekommentarer på engelsk.

## 1. Analyse af inspiration

- **Video:** træk 12 til 20 jævnt fordelte frames ud og saml dem i et kontaktark:
  `ffmpeg -i in.mp4 -vf "fps=N/DURATION,scale=640:-1" f_%02d.jpg`
- **Link:** tag screenshots ved 0, 25, 50, 75 og 100 procent scroll.
- Lav et effekt-inventar som tabel med kolonnerne sektion, effekt, trigger, assets og sværhedsgrad (1 til 3). Kortlæg hver effekt til en eksisterende byggeklods i `docs/LANDING_MOTION.md`, før du foreslår en ny.
- Sig tydeligt, hvor en effekt ikke kan bygges som i inspirationen, og hvorfor. Fx kræver H1-testen én tekstnode, så ord-for-ord-reveal er udelukket. Og niveauerne i `TierLadder` er faneblade, som skal kunne betjenes med tastatur og skærmlæser.

## 2. Husets måde at bygge på

- **Ingen animationsbiblioteker** på landingen: ingen GSAP, Lenis eller Framer `initial={{ opacity: 0 }}`. Platformen er nok.
- **Hvilestanden læses uden JS.** Tekst må aldrig vente på JS for at blive synlig. `data-reveal` og `reveal-pending` er forbudt af gates.
- **Foretræk CSS scroll-driven animation** (`animation-timeline: view()` og navngivne view-timelines) bag `@supports` og `prefers-reduced-motion: no-preference`.
- **Når JS er nødvendigt:** en lille `"use client"`-ø med samme form som `NightCurveReveal` og `GalleryRig`. Den observerer og skriver en `data-*`-attribut eller en CSS-variabel, og CSS gør resten. Ingen scroll-listeners, hvis en view-timeline kan klare det.
- **Animer kun** `transform`, `opacity` og farvetokens. Aldrig layout-egenskaber.
- **Landing-CSS** ligger i `src/app/globals.css` i afsnittet "Landing helpers", scoped til `[data-theme="nord"]` og uden for `@layer`, så den slår Tailwind-klasser.
- **Farver kun som tokens.** Ingen hex, `rgba()` eller palette-klasser i `.tsx` under landing. Literal-værdier må kun stå i `globals.css` som spejl af Nord- og nat-tokens.
- **Rene beregninger** hører hjemme i `src/lib/marketing/landing/*.ts` med en `*.test.ts` ved siden af. Se `scroll-sequence.ts`, `gallery.ts` og `magnet.ts`.
- **Mørke blokke** på landingen kræver en begrundelse i indholdet og en linje under Temaer i `DESIGN.md`. Brug aldrig `ThemeScope` midt på siden.
- **Reduced motion:** hver ny animation skal have en reduceret variant. Effekten skal være slået fra, og siden skal stå som den statiske version.
- **Mobil:** ingen pin under 1024 px. Brug native swipe med `snap-x` i stedet. Ingen sideværts scroll ved 390 px.
- **Rediger med `Edit`** eller små målrettede ændringer. Kør aldrig prettier på filerne. Repoet har ingen prettier-konfiguration, og den omformaterer hele filer.

## 3. Assets

Assets er det meste af resultatet. Lav en assetliste, før der bygges noget, der afhænger af fotos, video eller 3D, og byg med placeholders indtil de er leveret. `ScrollSequence` er klar til billedsekvensen A1. Monteringen er beskrevet i `docs/LANDING_MOTION.md`.

## 4. Tjek før push

1. `npx vitest run` (alle gates, fx `landing-gates`, `public-landing`, `nord-*` og `public-anchors`), `npx eslint` og `npx tsc --noEmit`.
2. Kør `next dev`, og se effekten i Chromium (`/opt/pw-browsers/chromium` i cloud-sessioner) ved 1440 × 900 og 390 × 844 samt med `reducedMotion: 'reduce'`. Mål med `getComputedStyle`, om animationerne faktisk kører, i stedet for kun at kigge.
3. **Cache:** dev-serveren kan servere et forældet stylesheet efter CSS-ændringer. Stop serveren i ét kald, kør `rm -rf .next` i det næste, og start igen. Kontrollér, at den serverede CSS indeholder den nye regel.
4. Ignorer kun det, der var der i forvejen. Dev-hydration-advarslen fra `EngineDemo`-sliderne er kendt.

## 5. Levering

1. Arbejd på en branch, fx `feat/landing-<emne>`. Commits skrives på dansk og forklarer hvad og hvorfor.
2. Push branchen. Vercel bygger en preview automatisk. Find URL'en, og send den til Tom med en kort liste over, hvad han skal se efter oppefra og ned.
3. Når Tom har godkendt, åbner du en PR mod `main` med en tabel over effekter, regler og test samt preview-linket.
4. **Tom merger selv.** Merge til `main` deployer til produktion på makeit.tomhedegaard.dk. Bagefter tjekker du, at produktionsdeployet er `READY`, og at effekterne findes på domænet.
5. Opdater `docs/LANDING_MOTION.md` med nye byggeklodser, og `DESIGN.md` hvis en regel ændres.
