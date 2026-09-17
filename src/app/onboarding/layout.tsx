import type { Viewport } from "next";
import ThemeScope from "@/components/ui/ThemeScope";

export const viewport: Viewport = { themeColor: "#E7E9EB", colorScheme: "light" };

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeScope theme="kalk" className="relative z-10 minh-dvh">
      {children}
    </ThemeScope>
  );
}
