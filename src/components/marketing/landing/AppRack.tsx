import { useTranslations } from "next-intl";
import DashboardScreen from "@/components/marketing/phone/screens/DashboardScreen";
import SleepScreen from "@/components/marketing/phone/screens/SleepScreen";
import HrvScreen from "@/components/marketing/phone/screens/HrvScreen";
import DecisionScreen from "@/components/marketing/phone/screens/DecisionScreen";
import SessionScreen from "@/components/marketing/phone/screens/SessionScreen";
import FormCheckScreen from "@/components/marketing/phone/screens/FormCheckScreen";
import CoachScreen from "@/components/marketing/phone/screens/CoachScreen";
import ProgressScreen from "@/components/marketing/phone/screens/ProgressScreen";
import BlockScreen from "@/components/marketing/phone/screens/BlockScreen";
import FoodScreen from "@/components/marketing/phone/screens/FoodScreen";
import ShoppingScreen from "@/components/marketing/phone/screens/ShoppingScreen";
import MindScreen from "@/components/marketing/phone/screens/MindScreen";
import BreathScreen from "@/components/marketing/phone/screens/BreathScreen";
import MindCheckedScreen from "@/components/marketing/phone/screens/MindCheckedScreen";
import CrewScreen from "@/components/marketing/phone/screens/CrewScreen";
import ScreenRack from "./ScreenRack";

const RACK_PHONE_WIDTH = 272;

/**
 * One member's day, in order: the morning, the engine's call, the
 * session and the coach, then the programme, food, mind and the crew.
 * Every screen scrolls inside its frame, as the app does.
 */
const RACK_SCREENS = [
  { key: "dashboard", Screen: DashboardScreen },
  { key: "sleep", Screen: SleepScreen },
  { key: "hrv", Screen: HrvScreen },
  { key: "decision", Screen: DecisionScreen },
  { key: "session", Screen: SessionScreen },
  { key: "formCheck", Screen: FormCheckScreen },
  { key: "coach", Screen: CoachScreen },
  { key: "progress", Screen: ProgressScreen },
  { key: "block", Screen: BlockScreen },
  { key: "food", Screen: FoodScreen },
  { key: "shopping", Screen: ShoppingScreen },
  { key: "mind", Screen: MindScreen },
  { key: "breath", Screen: BreathScreen },
  { key: "mindChecked", Screen: MindCheckedScreen },
  { key: "crew", Screen: CrewScreen },
] as const;

/**
 * "Appen, i dagslys": every app screen in one swipeable rack, after the
 * four chapters. Server component; only the rack controls are a client
 * island.
 */
export default function AppRack() {
  const t = useTranslations("Marketing.landing.systems");
  const unit = useTranslations("Marketing.landing.hero")("plateUnit");

  const screens = RACK_SCREENS.map(({ key, Screen }) => ({
    key,
    node: <Screen width={RACK_PHONE_WIDTH} scroll />,
  }));

  return (
    <section id="systems" aria-labelledby="rack-heading" className="scroll-mt-[68px] overflow-x-clip py-[clamp(72px,8vw,128px)]">
      <div data-rack aria-labelledby="rack-heading" role="region" >
        <ScreenRack
          id="kalk-rack"
          listLabel={t("rack.listLabel")}
          prevLabel={t("rack.prev")}
          nextLabel={t("rack.next")}
          tag={t("rack.sample")}
          items={screens}
          head={
            <div>
              <h3 id="rack-heading" className="font-display text-[clamp(36px,4vw,56px)] leading-[0.9]!">
                {t("rack.heading")}
              </h3>
              <p className="mt-3 max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("rack.sub")}</p>
            </div>
          }
        />
        <div aria-hidden="true" className="mx-auto max-w-[1360px] px-4 md:px-8">
          <div className="relative h-2.5 bg-[linear-gradient(var(--fg),var(--fg))] bg-[length:100%_2px] bg-center bg-no-repeat before:absolute before:left-0 before:top-0 before:size-2.5 before:rounded-[2px] before:bg-fg after:absolute after:right-0 after:top-0 after:size-2.5 after:rounded-[2px] after:bg-fg" />
          <p className="mt-2.5 text-micro text-fg-dim">20 {unit}</p>
        </div>
      </div>
    </section>
  );
}
