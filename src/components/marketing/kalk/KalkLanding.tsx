import ThemeScope from "@/components/ui/ThemeScope";
import KalkNav from "./KalkNav";
import KalkHero from "./KalkHero";
import MotorStory from "./MotorStory";
import SystemsBento from "./SystemsBento";
import KalkMunk from "./KalkMunk";
import CrewPlates from "./CrewPlates";
import Voices from "./Voices";
import AccessPanel from "./AccessPanel";
import KalkFaq from "./KalkFaq";
import KalkFooter from "./KalkFooter";

/** Kalk landing (spec 2026-09-17 §5). Eight sections, one job each. */
export default function KalkLanding() {
  return (
    <ThemeScope theme="kalk" className="flex-1 flex flex-col">
      <KalkNav />
      <main className="relative z-10 flex-1">
        <KalkHero />
        <MotorStory />
        <SystemsBento />
        <KalkMunk />
        <CrewPlates />
        <Voices />
        <AccessPanel />
        <KalkFaq />
      </main>
      <KalkFooter />
    </ThemeScope>
  );
}
