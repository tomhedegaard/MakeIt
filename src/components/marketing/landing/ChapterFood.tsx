import { useLocale, useTranslations } from "next-intl";
import FoodScreen from "@/components/marketing/phone/screens/FoodScreen";
import ShoppingScreen from "@/components/marketing/phone/screens/ShoppingScreen";
import { MEAL_WEEK, mealPhotoSrc } from "@/lib/marketing/landing/meal-week";
import { formatNumber } from "@/lib/utils";

/**
 * Mad: an example week as seven plates with photos, then the two app
 * screens that turn it into today's meals and a shopping list. White
 * page, food-green type: the photos carry the colour.
 */
export default function ChapterFood() {
  const t = useTranslations("Marketing.landing.chapters.food");
  const days = t.raw("days") as string[];
  const meals = t.raw("meals") as string[];
  const points = t.raw("points") as string[];
  const numberLocale = useLocale() === "en" ? "en-GB" : "da-DK";
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

        <ol className="-mx-4 mt-12 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 lg:mx-0 lg:mt-16 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0">
          {MEAL_WEEK.map((meal, i) => (
            <li key={days[i]} className="w-[62vw] max-w-[260px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <div className="aspect-[4/5] overflow-hidden bg-food-tint">
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
                    className="size-full object-cover"
                  />
                ) : null}
              </div>
              <p className="mt-3 text-[13px] font-medium text-food">{days[i]}</p>
              <p className="mt-1 text-[15px] leading-snug">{meals[i]}</p>
              <p className="numeric mt-1.5 text-[13px] text-fg-dim">
                {t("macro", { kcal: formatNumber(meal.kcal, numberLocale), protein: meal.protein })}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-20">
          <ul className="grid gap-5">
            {points.map((point) => (
              <li key={point} className="border-t border-food-line pt-4 font-display text-[clamp(22px,2.4vw,34px)] leading-[1.1]">
                {point}
              </li>
            ))}
          </ul>
          <div className="flex justify-center gap-4 sm:gap-6">
            <FoodScreen width={240} />
            <div className="hidden pt-16 sm:block">
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
