import type { Metadata, Viewport } from "next";
import { Inter, Archivo_Black, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import RevealObserver from "@/components/RevealObserver";
import CookieBanner from "@/components/marketing/CookieBanner";
import CustomCursor from "@/components/CustomCursor";
import { COMPANY } from "@/lib/company";

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
  title: COMPANY.product,
  description: `${COMPANY.product} — ${COMPANY.tagline} Made in Denmark.`,
  metadataBase: new URL(COMPANY.appUrl),
  openGraph: {
    title: COMPANY.product,
    description: COMPANY.tagline,
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
        <CustomCursor />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
