import ThemeScope from "@/components/ui/ThemeScope";
import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import MotorStory from "./MotorStory";
import ChapterTrain from "./ChapterTrain";
import ChapterFood from "./ChapterFood";
import ChapterHeart from "./ChapterHeart";
import ChapterMind from "./ChapterMind";
import AppRack from "./AppRack";
import CrewAlone from "./CrewAlone";
import LandingMunk from "./LandingMunk";
import CrewPlates from "./CrewPlates";
import Voices from "./Voices";
import AccessPanel from "./AccessPanel";
import LandingFaq from "./LandingFaq";
import LandingFooter from "./LandingFooter";
import AskHq from "./AskHq";

/**
 * Nord landing. The hero opens four doors; each system then gets its own
 * chapter in its domain colour (owner decision 2026-10-05), the motor
 * explains the morning, and the crew closes: not alone, then the road
 * from first session to coach.
 */
export default function LandingPage() {
  return (
    <ThemeScope theme="nord" className="flex-1 flex flex-col">
      <LandingNav />
      <main className="relative z-10 flex-1">
        <LandingHero />
        <ChapterTrain />
        <ChapterFood />
        <ChapterHeart />
        <MotorStory />
        <ChapterMind />
        <AppRack />
        <CrewAlone />
        <CrewPlates />
        <LandingMunk />
        <Voices />
        <AccessPanel />
        <LandingFaq />
      </main>
      <LandingFooter />
      <AskHq />
    </ThemeScope>
  );
}
