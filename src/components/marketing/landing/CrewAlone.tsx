import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import CheerButton from "./CheerButton";

/**
 * The wall: the crew as faces. Initials only, decorative; a few are
 * "active" (ink), one is you (mos). Deterministic, so server and client
 * agree. More faces than fit: the wall clips them at its edge, so the
 * crew reads as larger than the frame.
 */
const FIRST = "AMLJSPERKTNHCIOFBDUGVZY";
const LAST = "KBHSNTVOLDFJMRAP";
const WALL = Array.from({ length: 160 }, (_, i) => `${FIRST[(i * 7) % FIRST.length]}${LAST[(i * 5 + 3) % LAST.length]}`);
const ACTIVE = new Set([3, 9, 17, 24, 31, 38, 46, 53, 60, 66, 79, 88, 97, 104, 118, 131, 142, 150]);
const YOU = 35;

/**
 * Activity that appears over the wall, one card after another. Positions
 * are percentages of the wall from `md`; below that the cards stack
 * under it. Feed copy is the crew screen's sample day.
 */
const CARDS = [
  { p: "p1", cheers: 14, at: "md:left-[6%] md:top-[10%]" },
  { p: "p4", cheers: 33, at: "md:left-[52%] md:top-[4%]" },
  { p: "p2", cheers: 6, at: "md:left-[28%] md:top-[40%]" },
  { p: "p3", cheers: 21, at: "md:left-[62%] md:top-[56%]" },
  { p: "p5", cheers: 9, at: "md:left-[4%] md:top-[72%]" },
] as const;

/**
 * "Nogen spotter dig altid.": the crew as people. A wall of faces with
 * the day's activity surfacing on it, then the four ways members show
 * up for each other. The only motion is CSS: where the browser has
 * view timelines the cards rise in one after another as the wall
 * scrolls into view (`.spot-card` in globals.css); elsewhere, and with
 * reduced motion, they simply stand.
 */
export default function CrewAlone() {
  const t = useTranslations("Marketing.landing.chapters.alone");
  const c = useTranslations("Marketing.landing.screens.crew");
  const features = t.raw("features") as { t: string; d: string }[];

  return (
    <section id="crew-alone" aria-labelledby="alone-heading" className="scroll-mt-[68px] overflow-x-clip">
      <div className="mx-auto max-w-[1360px] px-4 py-[clamp(72px,9vw,140px)] md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <h2 id="alone-heading" className="font-display max-w-[8em] text-[clamp(52px,8vw,128px)] leading-[0.88]!">
            {t("heading")}
          </h2>
          <p className="max-w-[44ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>
        </div>

        <div className="spot-wall relative mt-12 lg:mt-16">
          <ul
            aria-hidden="true"
            className="grid h-[360px] grid-cols-[repeat(auto-fill,minmax(36px,1fr))] content-start gap-2 overflow-hidden bg-bg-2 p-4 md:h-[340px] md:grid-cols-[repeat(auto-fill,minmax(48px,1fr))] md:gap-3 md:p-8 md:pb-0"
          >
            {WALL.map((initials, i) => (
              <li
                key={`${initials}-${i}`}
                className={cn(
                  "grid aspect-square place-items-center rounded-full text-[11px] md:text-[13px]",
                  i === YOU
                    ? "bg-signal font-medium text-bg"
                    : ACTIVE.has(i)
                      ? "bg-fg text-bg"
                      : "border border-line-strong text-fg-dim",
                )}
              >
                {i === YOU ? t("you") : initials}
              </li>
            ))}
          </ul>

          <ul className="relative z-10 -mt-10 grid gap-2 px-3 md:absolute md:inset-0 md:mt-0 md:block md:px-0">
            {CARDS.map(({ p, cheers, at }, i) => (
              <li
                key={p}
                style={{ ["--i" as string]: i }}
                className={cn(
                  "spot-card flex items-center gap-3 border border-line-strong bg-bg py-3 pl-3 pr-3 md:absolute md:max-w-[420px]",
                  at,
                )}
              >
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-[13px] font-medium text-bg"
                >
                  {c(`${p}i`)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-snug">
                    <span className="font-medium">{c(p)}</span> {c(`${p}t`)}
                  </span>
                  {/* Time only: the cheer count lives on the button. */}
                  <span className="mt-0.5 block text-[13px] text-fg-dim">{c(`${p}m`).split(" · ")[0]}</span>
                </span>
                <CheerButton
                  count={cheers}
                  label={t("cheerLabel", { name: c(p) })}
                  cheer={t("cheer")}
                  cheered={t("cheered")}
                />
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-14 grid gap-x-10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {features.map((f) => (
            <li key={f.t} className="border-t border-fg py-5">
              <p className="font-display text-[clamp(26px,2.6vw,38px)] leading-none">{f.t}</p>
              <p className="mt-2.5 max-w-[34ch] text-[15px] text-fg-dim">{f.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
