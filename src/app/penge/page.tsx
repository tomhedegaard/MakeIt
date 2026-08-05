import type { Metadata } from "next";
import { DM_Serif_Display, DM_Mono, Instrument_Sans } from "next/font/google";
import PengeDashboard from "./PengeDashboard";

const serif = DM_Serif_Display({
  variable: "--penge-font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const mono = DM_Mono({
  variable: "--penge-font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const sans = Instrument_Sans({
  variable: "--penge-font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Økonomi · Overblik",
  description: "Penge — samlet overblik over privat- og virksomhedsøkonomi.",
  robots: { index: false, follow: false },
};

export default function PengePage() {
  return (
    <div className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <PengeDashboard />
    </div>
  );
}
