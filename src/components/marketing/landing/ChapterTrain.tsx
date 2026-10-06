import { useTranslations } from "next-intl";
import DemoLoop from "@/components/marketing/DemoLoop";
import ExerciseTile from "./ExerciseTile";
import GalleryRig from "./GalleryRig";

/**
 * The wall: one moving demo, then stills from the real library. The lead
 * is only bigger in the static grid (a 2 × 2 cell); in the swipe row and
 * the pinned gallery every tile has the same size and the lead is simply
 * the one already playing (its dot is lit, like a tile under the mouse).
 */
const LEAD = "deadlift";
const WALL = ["back-squat", "bench", "pull-up", "hip-thrust", "ohp", "row", "rdl", "front-squat"] as const;

/**
 * Krop: the exercise library as a wall of the real 3D demos on a grey
 * field with ink type. Training is black and grey on the landing (owner
 * decision 2026-10-05): the live session is already ink, and the body
 * orange sat too close to the heart red. Server component; only the lead loop is a client island (it
 * plays in view, never with reduced motion).
 *
 * Below 1024 px the wall is a row to swipe. On wide screens GalleryRig
 * turns it into a pinned gallery: the stage (heading and wall) holds
 * still while the visitor's scroll slides the tiles sideways
 * (globals.css `[data-gallery="on"]`). Without JS it is the grid it
 * always was.
 */
export default function ChapterTrain() {
  const t = useTranslations("Marketing.landing.chapters.train");
  const s = useTranslations("Marketing.landing.screens");
  const facts = t.raw("facts") as string[];

  return (
    <section id="train" aria-labelledby="train-heading" className="scroll-mt-[68px] overflow-x-clip bg-bg-2 text-fg">
      <div className="mx-auto max-w-[1360px] px-4 py-[clamp(72px,9vw,140px)] md:px-8">
        <div data-gallery="">
          <div data-gallery-stage>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
              <h2 id="train-heading" className="font-display max-w-[9em] text-[clamp(48px,7vw,112px)] leading-[0.9]!">
                {t("heading")}
              </h2>
              <p className="max-w-[44ch] text-[clamp(17px,1.35vw,20px)] text-fg-body">{t("sub")}</p>
            </div>

            <p className="mt-12 text-[13px] text-fg-dim lg:mt-16">{t("hint")}</p>
            <ul
              data-gallery-track
              className="-mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:px-0"
            >
              <li
                className="flex w-[64vw] max-w-[300px] shrink-0 snap-start flex-col bg-bg text-fg lg:col-span-2 lg:row-span-2 lg:w-auto lg:max-w-none"
              >
                <DemoLoop
                  src={`/exercise-demos/${LEAD}.webm`}
                  label={t(`names.${LEAD}`)}
                  pauseLabel={s("pause")}
                  playLabel={s("play")}
                  className="aspect-[720/398] w-full"
                  compact
                />
                <p className="mt-auto flex items-center justify-between gap-2 px-3 pb-3 pt-1 text-[14px]">
                  {t(`names.${LEAD}`)}
                  <span aria-hidden="true" className="size-2 rounded-full bg-signal" />
                </p>
              </li>
              {WALL.map((slug) => (
                <li key={slug} className="w-[64vw] max-w-[300px] shrink-0 snap-start lg:w-auto lg:max-w-none">
                  <ExerciseTile slug={slug} name={t(`names.${slug}`)} playLabel={s("play")} />
                </li>
              ))}
            </ul>
          </div>
          <GalleryRig />
        </div>

        <ul className="mt-12 grid gap-x-8 gap-y-5 md:grid-cols-3 lg:mt-16">
          {facts.map((fact) => (
            <li key={fact} className="border-t border-line-strong pt-4 text-[clamp(16px,1.3vw,19px)]">
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
