import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import PhoneFrame from "../PhoneFrame";
import { Headline, Kicker, Label } from "./parts";

/** The week's list by aisle; the first four items are in the basket. */
const GROUPS = [
  { key: "g1", items: ["i1", "i2", "i3"] },
  { key: "g2", items: ["i4", "i5"] },
  { key: "g3", items: ["i6", "i7", "i8", "i9"] },
  { key: "g4", items: ["i10", "i11", "i12", "i13", "i14"] },
] as const;
const IN_BASKET = new Set<string>(["i1", "i2", "i3", "i4"]);

/** Mad: indkøbslisten til ugens plan. */
export default function ShoppingScreen({ width, scroll }: { width?: number; scroll?: boolean }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");
  const sh = (key: string) => s(`shopping.${key}`);

  return (
    <PhoneFrame label={sh("aria")} tab="food" width={width} scroll={scroll}>
      <div>
        <Kicker domain="food" dot>
          {t("systems.food.kicker")}
        </Kicker>
        <Headline className="mt-1">{sh("title")}</Headline>
        <p className="mt-0.5 text-[10.5px] text-fg-dim">{sh("sub")}</p>
      </div>

      <div data-domain="food" className="flex h-1.5 overflow-hidden rounded-full bg-line">
        <i className="block h-full w-[29%] bg-domain" />
      </div>
      <Label>{sh("done")}</Label>

      {GROUPS.map((group) => (
        <div key={group.key}>
          <Label className="mb-1">{sh(group.key)}</Label>
          {group.items.map((item, i) => {
            const done = IN_BASKET.has(item);
            return (
              <div
                key={item}
                className={cn(
                  "grid grid-cols-[14px_1fr_auto] items-center gap-2 border-t border-line py-[6px]",
                  i === group.items.length - 1 && "border-b",
                )}
              >
                <i
                  data-domain="food"
                  className={cn(
                    "grid size-3 place-items-center rounded-[4px] border",
                    done ? "border-domain bg-domain" : "border-line-strong",
                  )}
                />
                <span className={cn("text-[10.5px]", done && "text-fg-dim line-through")}>{sh(item)}</span>
                <span className="font-mono text-[9.5px] text-fg-dim">{sh(`${item}v`)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </PhoneFrame>
  );
}
