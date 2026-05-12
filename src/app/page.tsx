import MarketingNav from "@/components/marketing/MarketingNav";
import Hero from "@/components/marketing/Hero";
import CrewSection from "@/components/marketing/CrewSection";
import PillarsSection from "@/components/marketing/PillarsSection";
import TierJourney from "@/components/marketing/TierJourney";
import AppShowcase from "@/components/marketing/AppShowcase";
import ValueSection from "@/components/marketing/ValueSection";
import Testimonials from "@/components/marketing/Testimonials";
import OriginSection from "@/components/marketing/OriginSection";
import FAQ from "@/components/marketing/FAQ";
import MarketingFooter from "@/components/marketing/Footer";
import Marquee from "@/components/Marquee";

export default function Home() {
  return (
    <>
      <MarketingNav />
      <main className="relative z-10 flex-1">
        <Hero />
        <Marquee
          items={[
            "STRAPIT",
            "HOOKIT",
            "MADE IN DENMARK",
            "KØBENHAVN",
            "50.000+ LIFTS",
            "CLOSED BETA",
            "FOR THE CREW",
          ]}
        />
        <CrewSection />
        <PillarsSection />
        <TierJourney />
        <AppShowcase />
        <ValueSection />
        <Testimonials />
        <OriginSection />
        <FAQ />
      </main>
      <MarketingFooter />
    </>
  );
}
