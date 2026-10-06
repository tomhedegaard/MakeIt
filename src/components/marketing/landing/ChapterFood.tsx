import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import FoodScreen from "@/components/marketing/phone/screens/FoodScreen";
import ShoppingScreen from "@/components/marketing/phone/screens/ShoppingScreen";
import { MEAL_WEEK, mealPhotoSrc } from "@/lib/marketing/landing/meal-week";
import { formatNumber } from "@/lib/utils";
import { weekTotal } from "@/lib/marketing/landing/count-up";
import CountUp from "./CountUp";
import InViewOnce from "./InViewOnce";
import PlateToggle from "./PlateToggle";

/**
 * Mad: an example week as seven plates with photos, then the two app
 * screens that turn it into today's meals and a shopping list. White
 * page, food-green type: the photos carry the colour. On arrival the
 * plates set themselves down Monday to Sunday and the week's totals
 * count up beneath them (InViewOnce and CountUp, once).
 */
export default function ChapterFood() {
  const t = useTranslations("Marketing.landing.chapters.food");
  const m = useTranslations("Marketing.landing.systems.food");
  const days = t.raw("days") as string[];
  const meals = t.raw("meals") as string[];
  const points = t.raw("points") as string[];
  const numberLocale = useLocale() === "en" ? "en-GB" : "da-DK";
  const totals = [
    { label: "kcal", value: weekTotal(MEAL_WEEK, (d) => d.kcal), unit: "" },
    { label: m("p"), value: weekTotal(MEAL_WEEK, (d) => d.protein), unit: "g" },
    { label: m("c"), value: weekTotal(MEAL_WEEK, (d) => d.carbs), unit: "g" },
    { label: m("f"), value: weekTotal(MEAL_WEEK, (d) => d.fat), unit: "g" },
  ];
  const credits = [
    ...new Map(MEAL_WEEK.flatMap((m) => (m.photo ? [[m.photo.author, m.photo.authorUrl] as const] : []))).entries(),
  ];

  return (
    <section id="food" aria-labelledby="food-heading" data-domain="food" className="scroll-mt-[68px] overflow-x-clip">
      <div className="mx-auto max-w-[1360px] px-4 py-[clamp(72px,9vw,140px)] md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <h2 id="food-heading" className="font-display max-w-[9em] text-[clamp(48px,7vw,112px)] leading-[0.9]! text-food">
            {t("heading")}
          </h2>
          <p className="max-w-[44ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>
        </div>

        <div data-once className="food-week">
        <InViewOnce threshold={0.2} />
        <ol className="-mx-4 mt-12 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 lg:mx-0 lg:mt-16 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0">
          {MEAL_WEEK.map((meal, i) => (
            <li key={days[i]} style={{ "--i": i } as CSSProperties} className="group w-[62vw] max-w-[260px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <div className="relative aspect-[4/5] overflow-hidden bg-food-tint">
                {meal.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Unsplash CDN sizes the image itself
                  <img
                    src={mealPhotoSrc(meal.photo.url, 400)}
                    srcSet={`${mealPhotoSrc(meal.photo.url, 400)} 400w, ${mealPhotoSrc(meal.photo.url, 640)} 640w`}
                    sizes="(min-width: 1024px) 180px, 62vw"
                    alt={meals[i]}
                    loading="lazy"
                    width={400}
                    height={500}
                    className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                ) : null}
                <PlateToggle label={t("showMacros", { meal: meals[i] })} />
                <MacroOverlay
                  rows={[
                    { label: m("p"), g: meal.protein, kcal: meal.protein * 4 },
                    { label: m("c"), g: meal.carbs, kcal: meal.carbs * 4 },
                    { label: m("f"), g: meal.fat, kcal: meal.fat * 9 },
                  ]}
                  grams={(g) => t("grams", { g })}
                />
              </div>
              <p className="mt-3 text-[13px] font-medium text-food">{days[i]}</p>
              <p className="mt-1 text-[15px] leading-snug">{meals[i]}</p>
              <p className="numeric mt-1.5 text-[13px] text-fg-dim">
                {t("macro", { kcal: formatNumber(meal.kcal, numberLocale), protein: meal.protein })}
              </p>
            </li>
          ))}
        </ol>

        <div className="food-week__total mt-8 border-t border-food-line pt-5 lg:mt-10">
          <p className="text-[13px] text-fg-dim">{t("weekTotal")}</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {totals.map((row) => (
              <li key={row.label}>
                <p className="font-display text-[clamp(32px,3.6vw,56px)] leading-none text-food">
                  <CountUp to={row.value} locale={numberLocale} delay={700} />
                  {row.unit ? <span className="ml-1.5 text-[0.45em]">{row.unit}</span> : null}
                </p>
                <p className="mt-1.5 text-[13px] text-fg-dim">{row.label}</p>
              </li>
            ))}
          </ul>
        </div>
        </div>

        <div className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-20">
          <ul className="grid gap-5">
            {points.map((point) => (
              <li key={point} className="border-t border-food-line pt-4 font-display text-[clamp(22px,2.4vw,34px)] leading-[1.1]">
                {point}
              </li>
            ))}
          </ul>
          {/* Below 640 px the two screens are a swipe row, the shopping list
              first, so its gather-in is what the visitor sees. */}
          <div data-once className="food-shop -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:justify-center sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
            <InViewOnce threshold={0.3} />
            <div className="flex-none snap-start sm:order-1">
              <FoodScreen width={240} />
            </div>
            <div className="order-first flex-none snap-start sm:order-2 sm:pt-16">
              <ShoppingScreen width={240} />
            </div>
          </div>
        </div>

        {credits.length ? (
          <p className="mt-12 text-micro text-fg-dim">
            {t("credit")}{" "}
            {credits.map(([name, href], i) => (
              <span key={href}>
                <a href={`${href}?utm_source=makeit&utm_medium=referral`} className="underline-offset-2 hover:text-fg">
                  {name}
                </a>
                {i < credits.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Hover detail: the plate's energy split as three bars, sliding up over
 * the photo. Decorative for assistive tech: kcal and protein are already
 * in the card's text. On touch a tap opens it (PlateToggle).
 */
function MacroOverlay({ rows, grams }: { rows: { label: string; g: number; kcal: number }[]; grams: (g: number) => string }) {
  const total = rows.reduce((n, r) => n + r.kcal, 0);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] translate-y-full bg-bg/95 p-3 transition-transform duration-300 ease-out group-hover:translate-y-0 group-data-[open=true]:translate-y-0 motion-reduce:transition-none"
    >
      {rows.map((r, i) => (
        <div key={r.label} className="mt-1.5 first:mt-0">
          <div className="flex justify-between text-[11px] text-fg-dim">
            <span>{r.label}</span>
            <span className="numeric text-fg">{grams(r.g)}</span>
          </div>
          <div className="mt-1 h-1 bg-line">
            <i
              className="block h-full origin-left scale-x-0 bg-food transition-transform duration-500 ease-out group-hover:scale-x-100 group-data-[open=true]:scale-x-100 motion-reduce:transition-none"
              style={{ width: `${Math.round((r.kcal / total) * 100)}%`, transitionDelay: `${150 + i * 80}ms`, opacity: 1 - i * 0.28 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
