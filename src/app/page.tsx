import type { Viewport } from "next";
import KalkLanding from "@/components/marketing/kalk/KalkLanding";

// Kalk is a light page scope on a dark-default root layout.
export const viewport: Viewport = {
  themeColor: "#E7E9EB",
  colorScheme: "light",
};

export default function Home() {
  return <KalkLanding />;
}
