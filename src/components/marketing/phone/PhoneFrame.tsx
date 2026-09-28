import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CalendarDays, Users } from "lucide-react";
import { ICON } from "@/components/ui/icon";
import DomainMark from "@/components/brand/DomainMark";

export type PhoneTab = "today" | "train" | "food" | "mind" | "crew";

const TABS: readonly PhoneTab[] = ["today", "train", "food", "mind", "crew"];

/**
 * Marketing phone (reference B `.phone`, `.screen`, `.island`, `.sbar`,
 * `.tabbar`). Server component, tokens only.
 *
 * The screen is one image for assistive tech: `role="img"` with a
 * describing label, and the drawn UI is aria-hidden. A screen that
 * carries a real control (the form-check loop has a pause button)
 * passes `interactive`: the frame becomes a labelled group and the
 * screen hides its own static parts, so the control stays reachable.
 *
 * The device is hardware, not interface: the frame, screen, island
 * and home bar keep a real phone's rounded shapes, while everything
 * drawn on the screen follows Nord's radius 0. The corner ratios match
 * EngineDemo and the MotorStoryRig backplate (16 % / 13 % of width).
 *
 * `dark` wraps the screen in a plain `data-theme="nat"` block (no
 * `.theme-root`, spec §2), so one screen can be dark on a Kalk page.
 *
 * `scroll` lets the content run past the fold, as in the app: the
 * screen scrolls inside the frame and fades out above the tab bar.
 * The scroller is focusable so arrow keys work, which makes the frame
 * a labelled group rather than an image. Overscroll is left on auto,
 * so a wheel at the end of a screen carries on down the page.
 */
export default function PhoneFrame({
  label,
  tab,
  dark = false,
  width = 280,
  interactive = false,
  scroll = false,
  className,
  children,
}: {
  label: string;
  tab?: PhoneTab;
  dark?: boolean;
  width?: number;
  interactive?: boolean;
  scroll?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const content = "flex flex-col gap-[9px] px-[14px] pt-1.5 *:flex-none";
  const screen = (
    <div
      role={interactive || scroll ? "group" : "img"}
      aria-label={label}
      className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--pw)*0.13)] bg-bg text-[11px] leading-[1.4] text-fg"
    >
      <PhoneStatusBar />
      {scroll ? (
        <div
          data-phone-scroll
          tabIndex={0}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "[mask-image:linear-gradient(to_bottom,black_calc(100%_-_28px),transparent)]",
            "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-fg",
          )}
        >
          <div aria-hidden={interactive ? undefined : true} className={cn(content, "pb-8")}>
            {children}
          </div>
        </div>
      ) : (
        <div
          aria-hidden={interactive ? undefined : true}
          className={cn(content, "min-h-0 flex-1 overflow-hidden")}
        >
          {children}
        </div>
      )}
      <PhoneTabBar tab={tab} dark={dark} />
    </div>
  );

  return (
    <div
      style={{ "--pw": `${width}px` } as CSSProperties}
      className={cn(
        "relative aspect-[9/19.5] w-[var(--pw)] flex-none rounded-[calc(var(--pw)*0.16)] bg-fg p-[calc(var(--pw)*0.032)]",
        className,
      )}
    >
      {dark ? (
        <div data-theme="nat" className="h-full">
          {screen}
        </div>
      ) : (
        screen
      )}
      {/* Island sits on the bezel, outside any Nat block, so it stays ink. */}
      <i
        aria-hidden="true"
        className="absolute left-1/2 top-[calc(var(--pw)*0.032_+_9px)] z-10 h-6 w-[31%] -translate-x-1/2 rounded-full bg-fg"
      />
    </div>
  );
}

/**
 * The drawn status bar at the top of a screen. Exported because the
 * hero's motor demo builds its own frame (it owns the `aria-live`
 * region and must drop the whole frame below `lg`), and the chrome
 * should be drawn in exactly one place.
 */
export function PhoneStatusBar({ className }: { className?: string }) {
  const t = useTranslations("Marketing.landing");
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-[42px] flex-none items-center justify-between pl-[26px] pr-[22px] pt-1 text-[12px] font-semibold",
        className,
      )}
    >
      <span>{t("screens.time")}</span>
      <StatusGlyph />
    </div>
  );
}

/** The drawn tab bar at the foot of a screen. Exported for the same reason. */
export function PhoneTabBar({
  tab,
  dark = false,
  className,
}: {
  tab?: PhoneTab;
  dark?: boolean;
  className?: string;
}) {
  const t = useTranslations("Marketing.landing");
  const nav = useTranslations("Nav.links");
  const tabLabel: Record<PhoneTab, string> = {
    today: nav("today"),
    train: nav("train"),
    food: nav("food"),
    mind: t("systems.mind.kicker"),
    crew: nav("crew"),
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid flex-none grid-cols-5 border-t border-line px-2 pb-5 pt-2",
        dark ? "bg-bg-3" : "bg-bg-2",
        className,
      )}
    >
      {TABS.map((key) => {
        const on = key === tab;
        return (
          <span
            key={key}
            className={cn(
              "relative flex flex-col items-center gap-[3px] pt-[5px] text-[8px]",
              on ? "font-medium text-fg" : "text-fg-dim",
            )}
          >
            {on ? <i className="absolute -top-[9px] h-[2px] w-[22px] bg-signal" /> : null}
            <TabGlyph tab={key} />
            {tabLabel[key]}
          </span>
        );
      })}
      <i className="absolute bottom-1.5 left-1/2 h-1 w-[34%] -translate-x-1/2 rounded-full bg-fg opacity-85" />
    </div>
  );
}

function StatusGlyph() {
  return (
    <svg viewBox="0 0 34 12" className="h-2.5 w-auto" fill="currentColor">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5" width="3" height="7" rx="1" />
      <rect x="10" y="2" width="3" height="10" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" opacity=".35" />
      <rect x="21" y="1" width="11" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="22.8" y="2.8" width="6" height="6.4" rx="1.5" />
      <rect x="32.6" y="4.5" width="1.4" height="3" rx=".7" />
    </svg>
  );
}

/**
 * The mockup's tab bar shows the app's own icons (Nord, spec §11): the
 * domain tabs are their DomainMark, I dag and Crew the same line family,
 * so the phone on the landing is the app, not a lookalike.
 */
function TabGlyph({ tab }: { tab: PhoneTab }) {
  const cls = "size-[17px]";
  switch (tab) {
    case "today":
      return <CalendarDays {...ICON} className={cls} />;
    case "train":
      return <DomainMark domain="body" className={cls} />;
    case "food":
      return <DomainMark domain="food" className={cls} />;
    case "mind":
      return <DomainMark domain="mind" className={cls} />;
    case "crew":
      return <Users {...ICON} className={cls} />;
  }
}
