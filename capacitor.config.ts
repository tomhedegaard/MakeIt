import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor-shells — App Store-planens Fase 3 (docs/APP_STORE_PLAN.md).
 *
 * Server-drevet hybrid: shells renderer den live app fra produktion,
 * så enhver web-deploy slår igennem i begge apps øjeblikkeligt.
 * Capacitor-dokumentationen fraskriver server.url til produktion
 * (offline/perf-trade-offs) — det er et bevidst arkitekturvalg her,
 * mitigeret af planens Fase 3/4: offline-skærm i sw.js, native push,
 * HealthKit og haptics er det "ikke bare en hjemmeside"-lag, der
 * består Apple 4.2.
 *
 * appendUserAgent-markøren er kontrakten med webappen: både
 * src/lib/platform.ts (klient) og src/lib/platform-server.ts (server)
 * gater på "MakeItApp" — fx skjules købs-UI på /billing (Apple 3.1.1).
 */
const config: CapacitorConfig = {
  appId: "eu.nowmakeit.app",
  appName: "MakeIt",
  // Local fallback shell — only shown if the remote app can't load.
  webDir: "native-shell",
  backgroundColor: "#0A0A0B",
  server: {
    url: "https://makeit.tomhedegaard.dk",
    allowNavigation: ["makeit.tomhedegaard.dk"],
  },
  ios: {
    appendUserAgent: "MakeItApp/1 (ios)",
  },
  android: {
    appendUserAgent: "MakeItApp/1 (android)",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#0A0A0B",
    },
  },
};

export default config;
