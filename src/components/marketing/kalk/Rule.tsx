import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const MARKS = ["20", "60", "100", "140", "180"] as const;

/** Kg ruler over a section, like the rack's hole grid (reference B `.rule`). Decorative. */
export default function Rule({ className }: { className?: string }) {
  const t = useTranslations("Marketing.kalk.hero");
  return (
    <div aria-hidden="true" className={cn("kalk-rule", className)}>
      {MARKS.map((mark, i) => (
        <span key={mark}>{i === MARKS.length - 1 ? `${mark} ${t("plateUnit")}` : mark}</span>
      ))}
    </div>
  );
}
