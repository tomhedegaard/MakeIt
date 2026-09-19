import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Card, Chevron, Dot, Headline, Kicker, Label, Pill, Row } from "./parts";

/** Protein per meal as bar heights: morning, lunch, dinner, snack. */
const PROTEIN = [
  { key: "pMorning", h: 34 },
  { key: "pLunch", h: 30 },
  { key: "pDinner", h: 42 },
  { key: "pSnack", h: 24 },
] as const;

/** Mad: today's plan and the shopping list (reference B "Mad"). */
export default function FoodScreen({ width, scroll = false }: { width?: number; scroll?: boolean }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");
  const nav = useTranslations("Nav.links");
  const slot = useTranslations("Nutrition.slotLabels");

  const meals = [
    { slot: slot("morgen"), dish: s("food.breakfast") },
    { slot: slot("frokost"), dish: s("food.lunch") },
    { slot: slot("aften"), dish: s("food.dinner") },
  ];

  return (
    <PhoneFrame label={s("food.aria")} tab="food" width={width} scroll={scroll}>
      <div>
        <Kicker domain="food">{t("systems.food.kicker")}</Kicker>
        <Headline className="text-[34px]">{t("systems.food.heading")}</Headline>
      </div>

      <p className="text-[12px] font-medium leading-[1.38]">{t("systems.food.quote")}</p>

      <Card>
        <div className="flex items-center justify-between">
          <Label>{nav("today")}</Label>
          <Label>{s("food.trainingDay")}</Label>
        </div>
        <p className="mt-1.5 font-display text-[30px]">
          {s("food.kcal")}{" "}
          <span className="font-mono text-[10px] font-medium normal-case">{s("food.kcalUnit")}</span>
        </p>
        <p className="mt-0.5 font-mono text-[10px]">{s("food.protein")}</p>
        <div data-domain="food" className="mt-[7px] flex h-2 gap-0.5 overflow-hidden rounded-lg">
          <i className="block h-full flex-[27] bg-domain" />
          <i className="block h-full flex-[43] bg-domain/45" />
          <i className="block h-full flex-[30] bg-domain/20" />
        </div>
      </Card>

      <Card className="py-1">
        {meals.map((m, i) => (
          <div
            key={m.slot}
            className={
              "grid grid-cols-[52px_1fr] items-baseline gap-2 py-2" +
              (i < meals.length - 1 ? " border-b border-line" : "")
            }
          >
            <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-fg-dim">
              {m.slot}
            </span>
            <b className="text-[11px] font-medium">{m.dish}</b>
          </div>
        ))}
      </Card>

      <Card className="flex items-center gap-[9px] px-[11px] py-[9px]">
        <Dot domain="food" />
        <span className="flex-1 font-medium">{s("food.shopping")}</span>
        <Chevron />
      </Card>
      {scroll ? (
        <>
          <div>
            <Row k={s("food.snackLabel")} v={s("food.snack")} />
            <Row k={s("food.waterLabel")} v={s("food.waterValue")} last />
          </div>
          <Pill ghost>{s("food.swap")}</Pill>
          <Card>
            <Label>{s("food.proteinLabel")}</Label>
            <div data-domain="food" className="mt-2 grid grid-cols-4 items-end gap-2">
              {PROTEIN.map((p) => (
                <div key={p.key} className="flex flex-col items-center gap-1">
                  <i style={{ height: p.h }} className="block w-full rounded-[3px] bg-domain" />
                  <span className="font-mono text-[8.5px] text-fg-dim">{s(`food.${p.key}`)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </PhoneFrame>
  );
}
