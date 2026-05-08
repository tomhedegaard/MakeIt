import type { Metadata, Viewport } from "next";
import { Inter, Archivo_Black, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import RevealObserver from "@/components/RevealObserver";
import CookieBanner from "@/components/marketing/CookieBanner";

const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin"],
  display: "swap",
});

const display = Archivo_Black({
  variable: "--font-display-stack",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MakeIt // HQ",
  description:
    "MakeIt // HQ — det interne univers for vores atleter, coaches og crew. Coaching, community, events og loyalitet samlet ét sted. Made in Denmark.",
  metadataBase: new URL("https://hq.nowmakeit.eu"),
  openGraph: {
    title: "MakeIt // HQ",
    description:
      "Det interne univers for MakeIt-crewet. Coaching, community, events og loyalitet samlet ét sted.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="da"
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col grain vignette">
        <SmoothScroll />
        <RevealObserver />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
