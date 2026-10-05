import Image from "next/image";
import { useTranslations } from "next-intl";
import DemoLoop from "@/components/marketing/DemoLoop";
import { MUNK_HANDLE, MUNK_PORTRAIT_SRC } from "@/lib/marketing/munk";

/** Munk's card plays the back squat; the rack's form-check screen plays the bench. */
const MUNK_DEMO_SRC = "/exercise-demos/back-squat.webm";

type FlowStep = { t: string; label: string };

/**
 * Munk (reference B `.munk-type`, `.fc`; C `.flow`; A `.fc-sig`): the
 * wordmark, how an answer is made, and one signed form-check. The AI
 * draft is struck through in signal orange; the answer carries Munk's
 * signature. The exercise visual is the MoveKit loop, labelled as a
 * reference. Munk's face sits in the circle beside the wordmark; until a
 * portrait exists the circle shows his initials.
 */
export default function LandingMunk() {
  const t = useTranslations("Marketing.landing.munk");
  const s = useTranslations("Marketing.landing.screens");
  const flow = t.raw("flow") as FlowStep[];

  return (
    <section
      id="munk"
      aria-labelledby="munk-heading"
      className="scroll-mt-[68px] overflow-hidden pb-[clamp(72px,8vw,128px)] pt-[clamp(60px,7vw,110px)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <div className="font-display flex items-center justify-between gap-4 whitespace-nowrap text-[clamp(84px,25vw,430px)] leading-[0.78]! tracking-[-0.03em]!">
          <span aria-hidden="true">{MUNK_HANDLE}</span>
          {MUNK_PORTRAIT_SRC !== null ? (
            <Image
              src={MUNK_PORTRAIT_SRC}
              alt={t("portraitAlt")}
              width={407}
              height={509}
              sizes="(min-width: 1440px) 260px, 18vw"
              className="aspect-square w-[clamp(84px,18vw,260px)] flex-none rounded-full border border-line-strong object-cover object-[50%_22%]"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid aspect-square w-[clamp(76px,18vw,260px)] flex-none place-items-center rounded-full border border-line-strong bg-bg-2"
            >
              <b className="grid aspect-square w-[42%] place-items-center rounded-full bg-fg text-[clamp(18px,3vw,44px)] leading-none text-bg">
                {s("munkInitials")}
              </b>
            </span>
          )}
        </div>

        <div className="mt-[clamp(40px,5vw,72px)] grid items-start gap-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <h2 id="munk-heading" className="font-display text-[clamp(40px,4.6vw,68px)]">
              {t("heading")}
            </h2>
            <p className="mt-[22px] max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>
            <ol className="mt-[30px] grid list-none p-0">
              {flow.map((step) => (
                <li
                  key={step.t}
                  className="grid grid-cols-[78px_minmax(0,1fr)] items-baseline gap-3.5 border-t border-line py-3.5 last:border-b"
                >
                  <span className="text-[12px] font-medium leading-none text-fg-dim">
                    {step.t}
                  </span>
                  <b className="font-medium">{step.label}</b>
                </li>
              ))}
            </ol>
          </div>

          <FormCheckCard />
        </div>
      </div>
    </section>
  );
}

function FormCheckCard() {
  const c = useTranslations("Marketing.landing.munk.card");
  const s = useTranslations("Marketing.landing.screens");

  return (
    <article
      aria-labelledby="munk-card-title"
      className="grid overflow-hidden border border-line bg-bg-2 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
    >
      <DemoLoop
        src={MUNK_DEMO_SRC}
        label={s("formCheck.videoLabel")}
        pauseLabel={s("pause")}
        playLabel={s("play")}
        tag={c("reference")}
        className="min-h-[260px] rounded-none! md:min-h-[360px]"
      />

      <div className="flex flex-col p-[clamp(22px,3vw,36px)]">
        <p id="munk-card-title" className="text-[12px] text-fg-dim">
          {c("kicker")}
          <br />
          {c("lift")}
        </p>
        <p className="mt-[22px] text-[15px] text-fg-dim">
          <em className="mb-1.5 block text-micro not-italic">{c("draftLabel")}</em>
          <s className="decoration-signal decoration-2">{c("draft")}</s>
        </p>
        <p className="font-display mb-8 mt-[18px] text-[clamp(28px,2.6vw,38px)] leading-[0.98]!">{c("final")}</p>

        <div className="mt-auto flex flex-wrap-reverse items-end justify-between gap-x-3 gap-y-2 border-t border-line pt-4">
          <p className="whitespace-nowrap text-micro text-fg-dim">
            {c("signed")} · {c("answered")}
          </p>
          <Signature label={c("signatureLabel")} />
        </div>
      </div>
    </article>
  );
}

/** Munk's hand (reference A `.fc-sig`). Drawn in ink, not in a domain colour. */
function Signature({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 170 44"
      role="img"
      aria-label={label}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-auto w-[150px] flex-none text-fg"
    >
      <path d="M4 34C10 20 14 8 18 8S16 34 20 34 30 6 34 8 30 34 36 32 44 18 50 20 48 32 56 30 64 14 70 16 66 32 74 30 84 12 90 14 86 34 96 30" />
      <path d="M100 30C106 22 110 12 114 14S110 32 118 30 130 16 134 20 132 32 140 28 156 18 166 20" />
      <path d="M40 40C70 37 110 38 150 36" />
    </svg>
  );
}
