import ThemeScope from "@/components/ui/ThemeScope";
import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import MotorStory from "./MotorStory";
import SystemsBento from "./SystemsBento";
import LandingMunk from "./LandingMunk";
import CrewPlates from "./CrewPlates";
import Voices from "./Voices";
import AccessPanel from "./AccessPanel";
import LandingFaq from "./LandingFaq";
import LandingFooter from "./LandingFooter";
import AskHq from "./AskHq";

/** Kalk landing (spec 2026-09-17 §5). Eight sections, one job each. */
export default function LandingPage() {
  return (
    <ThemeScope theme="nord" className="flex-1 flex flex-col">
      <LandingNav />
      <main className="relative z-10 flex-1">
        <LandingHero />
        <MotorStory />
        <SystemsBento />
        <LandingMunk />
        <CrewPlates />
        <Voices />
        <AccessPanel />
        <LandingFaq />
      </main>
      <LandingFooter />
      <AskHq />
    </ThemeScope>
  );
}
