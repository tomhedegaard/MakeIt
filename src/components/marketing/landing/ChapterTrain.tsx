import { useTranslations } from "next-intl";
import DemoLoop from "@/components/marketing/DemoLoop";
import { resolveDemoAssets } from "@/lib/data/demo-assets";

/** The wall: one big moving demo, then stills from the real library. */
const LEAD = "deadlift";
const WALL = ["back-squat", "bench", "pull-up", "hip-thrust", "ohp", "row", "rdl", "front-squat"] as const;

/**
 * Krop: the exercise library as a wall of the real 3D demos on a quiet
 * body-tint field, body-coloured heading. Server component; only the lead loop is a client island (it
 * plays in view, never with reduced motion).
 */
export default function ChapterTrain() {
  const t = useTranslations("Marketing.landing.chapters.train");
  const s = useTranslations("Marketing.landing.screens");
  const facts = t.raw("facts") as string[];

  return (
    <section id="train" aria-labelledby="train-heading" className="scroll-mt-[68px] bg-body-tint text-fg">
      <div className="mx-auto max-w-[1360px] px-4 py-[clamp(72px,9vw,140px)] md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <h2 id="train-heading" className="font-display max-w-[9em] text-[clamp(48px,7vw,112px)] leading-[0.9]! text-body">
            {t("heading")}
          </h2>
          <p className="max-w-[44ch] text-[clamp(17px,1.35vw,20px)] text-fg-body">{t("sub")}</p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-2 md:grid-cols-4 lg:mt-16 lg:gap-3">
          <li className="col-span-2 row-span-2 flex flex-col bg-bg text-fg">
            <DemoLoop
              src={`/exercise-demos/${LEAD}.webm`}
              label={t(`names.${LEAD}`)}
              pauseLabel={s("pause")}
              playLabel={s("play")}
              className="aspect-[720/398] w-full"
            />
            <p className="font-display mt-auto px-4 pb-4 pt-2 text-[22px]">{t(`names.${LEAD}`)}</p>
          </li>
          {WALL.map((slug) => (
            <li key={slug} className="flex flex-col bg-bg text-fg">
              {/* eslint-disable-next-line @next/next/no-img-element -- static poster from /public */}
              <img
                src={resolveDemoAssets(`/exercise-demos/${slug}.webm`).poster}
                alt=""
                loading="lazy"
                width={720}
                height={398}
                className="aspect-[720/398] w-full object-cover"
              />
              <p className="mt-auto px-3 pb-3 pt-1 text-[14px]">{t(`names.${slug}`)}</p>
            </li>
          ))}
        </ul>

        <ul className="mt-12 grid gap-x-8 gap-y-5 md:grid-cols-3 lg:mt-16">
          {facts.map((fact) => (
            <li key={fact} className="border-t border-body-line pt-4 text-[clamp(16px,1.3vw,19px)]">
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
