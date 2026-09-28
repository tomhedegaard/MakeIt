import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import CookieBanner from "@/components/marketing/CookieBanner";
import SWRegister from "@/components/pwa/SWRegister";
import NativeChrome from "@/components/native/NativeChrome";
import { COMPANY } from "@/lib/company";

// Nord (spec 2026-09-26 §4) has ONE typographic voice: Schibsted Grotesk in
// 400 and 500. Display, body and numerals are the same family, so a single
// next/font call feeds all three token stacks (see @theme inline in
// globals.css) and no surface can reach for a second font.
const sans = Schibsted_Grotesk({
  variable: "--font-sans-stack",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: COMPANY.product,
  description: `${COMPANY.product}: ${COMPANY.tagline} Made in Denmark.`,
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
    statusBarStyle: "default",
    title: COMPANY.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
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
      className={`${sans.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <SWRegister />
          <NativeChrome />
          {children}
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
