import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import CookieBanner from "@/components/marketing/CookieBanner";
import CustomCursor from "@/components/CustomCursor";
import SWRegister from "@/components/pwa/SWRegister";
import NativeChrome from "@/components/native/NativeChrome";
import { COMPANY } from "@/lib/company";

// Kalk (spec 2026-09-17 §3.2) is the one typographic voice. Nat surfaces
// (/session, /coach) use the same families with dark colours.
const display = Big_Shoulders({
  variable: "--font-display-stack",
  subsets: ["latin"],
  display: "swap",
  // next/font has no automatic fallback metrics for Big Shoulders; opt out
  // instead of letting the build warn on every run.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Helvetica Neue", "sans-serif"],
});

const sans = Geist({ variable: "--font-sans-stack", subsets: ["latin"], display: "swap" });

const mono = Geist_Mono({ variable: "--font-mono-stack", subsets: ["latin"], display: "swap" });

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
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col grain vignette">
        <NextIntlClientProvider>
          <SmoothScroll />
          <CustomCursor />
          <SWRegister />
          <NativeChrome />
          {children}
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
