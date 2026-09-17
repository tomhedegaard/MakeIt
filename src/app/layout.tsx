import type { Metadata, Viewport } from "next";
import { Inter, Archivo_Black, JetBrains_Mono, Big_Shoulders, Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import CookieBanner from "@/components/marketing/CookieBanner";
import CustomCursor from "@/components/CustomCursor";
import SWRegister from "@/components/pwa/SWRegister";
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

// Kalk (spec 2026-09-17 §3.2). Nat keeps the three above until F4
// removes them. preload: false until a surface opts into Kalk, so
// Nat-only routes don't pay for three extra font files.
const kalkDisplay = Big_Shoulders({
  variable: "--font-kalk-display",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  // next/font has no automatic fallback metrics for Big Shoulders; opt out
  // instead of letting the build warn on every run.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Helvetica Neue", "sans-serif"],
});

const kalkSans = Geist({
  variable: "--font-kalk-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const kalkMono = Geist_Mono({
  variable: "--font-kalk-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
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
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: COMPANY.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${display.variable} ${mono.variable} ${kalkDisplay.variable} ${kalkSans.variable} ${kalkMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col grain vignette">
        <NextIntlClientProvider>
          <SmoothScroll />
          <CustomCursor />
          <SWRegister />
          {children}
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
