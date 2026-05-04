import MarketingNav from "@/components/marketing/MarketingNav";
import Hero from "@/components/marketing/Hero";
import CrewSection from "@/components/marketing/CrewSection";
import PillarsSection from "@/components/marketing/PillarsSection";
import OriginSection from "@/components/marketing/OriginSection";
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
            "AMAGERBRO 169",
            "50.000+ LIFTS",
            "CLOSED BETA",
            "FOR THE CREW",
          ]}
        />
        <CrewSection />
        <PillarsSection />
        <OriginSection />
      </main>
      <MarketingFooter />
    </>
  );
}
