import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

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
 * `dark` wraps the screen in a plain `data-theme="nat"` block (no
 * `.theme-root`, spec §2), so one screen can be dark on a Kalk page.
 */
export default function PhoneFrame({
  label,
  tab,
  dark = false,
  width = 280,
  interactive = false,
  className,
  children,
}: {
  label: string;
  tab?: PhoneTab;
  dark?: boolean;
  width?: number;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const screen = (
    <div
      role={interactive ? "group" : "img"}
      aria-label={label}
      className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--pw)*0.13)] bg-bg text-[11px] leading-[1.4] text-fg"
    >
      <PhoneStatusBar />
      <div
        aria-hidden={interactive ? undefined : true}
        className="flex min-h-0 flex-1 flex-col gap-[9px] overflow-hidden px-[14px] pt-1.5 *:flex-none"
      >
        {children}
      </div>
      <PhoneTabBar tab={tab} dark={dark} />
    </div>
  );

  return (
    <div
      style={{ "--pw": `${width}px` } as CSSProperties}
      className={cn(
        "relative aspect-[9/19.5] w-[var(--pw)] flex-none rounded-[calc(var(--pw)*0.16)] bg-fg p-[calc(var(--pw)*0.032)]",
        "shadow-[0_40px_60px_-30px_color-mix(in_oklab,var(--fg)_45%,transparent),0_12px_24px_-12px_color-mix(in_oklab,var(--fg)_30%,transparent)]",
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
        className="absolute left-1/2 top-[calc(var(--pw)*0.032_+_9px)] z-10 h-6 w-[31%] -translate-x-1/2 rounded-[14px] bg-fg"
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
  const t = useTranslations("Marketing.kalk");
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
  const t = useTranslations("Marketing.kalk");
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
              "relative flex flex-col items-center gap-[3px] pt-[5px] font-mono text-[8px] tracking-[0.04em]",
              on ? "font-medium text-fg" : "text-fg-dim",
            )}
          >
            {on ? <i className="absolute -top-[9px] h-[3px] w-[22px] rounded-b-[3px] bg-signal" /> : null}
            <TabGlyph tab={key} />
            {tabLabel[key]}
          </span>
        );
      })}
      <i className="absolute bottom-1.5 left-1/2 h-1 w-[34%] -translate-x-1/2 rounded-[3px] bg-fg opacity-85" />
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

/** Tab-bar glyphs from reference B's symbol set. The only icons allowed. */
function TabGlyph({ tab }: { tab: PhoneTab }) {
  const common = {
    viewBox: "0 0 20 20",
    className: "size-[17px]",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (tab) {
    case "today":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="14" height="13" rx="3" />
          <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
        </svg>
      );
    case "train":
      return (
        <svg {...common}>
          <path d="M2 10h16" />
          <rect x="4" y="5" width="3" height="10" rx="1.2" fill="currentColor" stroke="none" />
          <rect x="13" y="5" width="3" height="10" rx="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "food":
      return (
        <svg {...common}>
          <path d="M3 9h14a7 7 0 0 1-14 0Z" />
          <path d="M8 6c0-1.5 1-2 1-3.5M12 6c0-1.5 1-2 1-3.5" strokeWidth="1.4" />
        </svg>
      );
    case "mind":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7" />
          <path d="M5.5 10.5c1.5-2 3-2 4.5 0s3 2 4.5 0" />
        </svg>
      );
    case "crew":
      return (
        <svg {...common}>
          <circle cx="7" cy="7.5" r="3" />
          <circle cx="14" cy="8.5" r="2.4" />
          <path d="M1.8 17c.6-3 2.6-4.6 5.2-4.6s4.6 1.6 5.2 4.6M13 12.8c2.4 0 4.2 1.3 4.8 4.2" />
        </svg>
      );
  }
}
