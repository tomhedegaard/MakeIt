import type { Viewport } from "next";
import LandingPage from "@/components/marketing/landing/LandingPage";

// Kalk is a light page scope on a dark-default root layout.
export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
};

export default function Home() {
  return <LandingPage />;
}
