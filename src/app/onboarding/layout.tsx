import type { Viewport } from "next";
import ThemeScope from "@/components/ui/ThemeScope";

// Onboarding is Kalk (spec §2): light browser chrome. Merges with the root viewport.
export const viewport: Viewport = { themeColor: "#FFFFFF", colorScheme: "light" };

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeScope theme="nord" className="relative z-10 minh-dvh">
      {children}
    </ThemeScope>
  );
}
