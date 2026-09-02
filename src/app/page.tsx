import MarketingNav from "@/components/marketing/MarketingNav";
import Hero from "@/components/marketing/Hero";
import WorksWith from "@/components/marketing/WorksWith";
import CrewSection from "@/components/marketing/CrewSection";
import AdaptivePlaygroundPublic from "@/components/marketing/AdaptivePlaygroundPublic";
import PillarsSection from "@/components/marketing/PillarsSection";
import TierJourney from "@/components/marketing/TierJourney";
import DomainIndexSection from "@/components/marketing/DomainIndexSection";
import GiveForwardSection from "@/components/marketing/GiveForwardSection";
import LandingLoop from "@/components/marketing/LandingLoop";
import AppShowcase from "@/components/marketing/AppShowcase";
import ValueSection from "@/components/marketing/ValueSection";
import WaitlistSection from "@/components/marketing/WaitlistSection";
import Testimonials from "@/components/marketing/Testimonials";
import FAQ from "@/components/marketing/FAQ";
import MarketingFooter from "@/components/marketing/Footer";
import Marquee from "@/components/Marquee";

export default function Home() {
  return (
    <>
      <MarketingNav />
      <main className="relative z-10 flex-1">
        <Hero />
        {/* De to sektioner der rammer først, rammer bredest: farvekoden
            introducerer de fire sundhedsdomæner (krop · mad · hjerte ·
            sind) med det samme, så den nysgerrige forstår 360-vinklen
            før noget andet — og crew-pyramiden fortæller hvorfor
            platformen vokser organisk. Begge betalte sig tidligere først
            af langt nede: Farvekoden lå mellem TierJourney og
            AppShowcase, og give-videre-historien fandtes kun som
            unlocks på Beast/Legend i TierJourney. */}
        <DomainIndexSection />
        <GiveForwardSection />
        {/* UX-audit C3: udstyrs-brands ude af marquee'en — landingen
            sælger platformen, ikke shoppen. */}
        <Marquee
          items={[
            "HRV-AWARE",
            "AI + COACH",
            "OPEN BRAIN",
            "MADE IN DENMARK",
            "KØBENHAVN",
            "CLOSED BETA",
            "FOR THE CREW",
          ]}
        />
        <WorksWith />
        <CrewSection />
        <AdaptivePlaygroundPublic />
        {/* Pris/value rykket op (Scanfit-teardown): prisankeret og
            "hvad er det" skal ses uden at scrolle gennem alle seks
            pillars. */}
        <ValueSection />
        <PillarsSection />
        <TierJourney />
        {/* Three-beat product loop: Program → Form-check, then
            AppShowcase opens on Helhed (MarketingBodyMap) and keeps
            the eight phones as a quieter evidence gallery. */}
        <LandingLoop />
        <AppShowcase />
        {/* UX-audit C5: OriginSection (StrapIt-fabrikshistorien) er
            taget af landingen — den hører til på webshoppen. */}
        <Testimonials />
        <WaitlistSection />
        <FAQ />
      </main>
      <MarketingFooter />
    </>
  );
}
