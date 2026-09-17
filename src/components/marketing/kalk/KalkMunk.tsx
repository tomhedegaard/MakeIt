import Image from "next/image";
import { useTranslations } from "next-intl";
import DemoLoop from "@/components/marketing/DemoLoop";
import { FORM_CHECK_DEMO_SRC } from "@/components/marketing/phone/screens/FormCheckScreen";
import { MUNK_HANDLE, MUNK_PORTRAIT_SRC } from "@/lib/marketing/munk";

type FlowStep = { t: string; label: string };

/**
 * Munk (reference B `.munk-type`, `.fc`; C `.flow`; A `.fc-sig`): the
 * wordmark, how an answer is made, and one signed form-check. The AI
 * draft is struck through in signal orange; the answer carries Munk's
 * signature. The exercise visual is the MoveKit loop, labelled as a
 * reference. The portrait only appears once an approved image exists.
 */
export default function KalkMunk() {
  const t = useTranslations("Marketing.kalk.munk");
  const s = useTranslations("Marketing.kalk.screens");
  const flow = t.raw("flow") as FlowStep[];

  return (
    <section
      id="munk"
      aria-labelledby="munk-heading"
      className="scroll-mt-[68px] overflow-hidden pb-[clamp(72px,8vw,128px)] pt-[clamp(60px,7vw,110px)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <div
          aria-hidden="true"
          className="font-display flex items-center justify-between gap-4 whitespace-nowrap text-[clamp(112px,29vw,430px)] leading-[0.78]! tracking-[-0.03em]!"
        >
          {MUNK_HANDLE}
          <span className="grid aspect-square w-[clamp(76px,18vw,260px)] flex-none place-items-center rounded-full border border-line-bright bg-[repeating-radial-gradient(circle,var(--bg-2)_0_7px,var(--bg-3)_7px_8px)] shadow-[0_30px_50px_-30px_color-mix(in_oklab,var(--fg)_50%,transparent)]">
            <b className="grid aspect-square w-[42%] place-items-center rounded-full bg-fg text-[clamp(18px,3vw,44px)] leading-none text-bg">
              {s("munkInitials")}
            </b>
          </span>
        </div>

        <div className="mt-[clamp(40px,5vw,72px)] grid items-start gap-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            {MUNK_PORTRAIT_SRC !== null ? (
              <Image
                src={MUNK_PORTRAIT_SRC}
                alt={t("portraitAlt")}
                width={480}
                height={600}
                className="mb-10 h-auto w-full max-w-[320px] rounded-[14px] object-cover"
              />
            ) : null}
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
                  <span className="font-mono text-[12px] font-medium leading-none tracking-[0.06em] text-fg-dim">
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
  const c = useTranslations("Marketing.kalk.munk.card");
  const s = useTranslations("Marketing.kalk.screens");

  return (
    <article
      aria-labelledby="munk-card-title"
      className="grid overflow-hidden rounded-[14px] border border-line bg-bg-2 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
    >
      <DemoLoop
        src={FORM_CHECK_DEMO_SRC}
        label={s("formCheck.videoLabel")}
        pauseLabel={s("pause")}
        playLabel={s("play")}
        tag={c("reference")}
        className="min-h-[260px] rounded-none! md:min-h-[360px]"
      />

      <div className="flex flex-col p-[clamp(22px,3vw,36px)]">
        <p id="munk-card-title" className="font-mono text-[12px] uppercase tracking-[0.06em] text-fg-dim">
          {c("kicker")}
          <br />
          {c("lift")}
        </p>
        <p className="mt-[22px] text-[15px] text-fg-dim">
          <em className="mb-1.5 block font-mono text-[10px] uppercase not-italic tracking-[0.1em]">{c("draftLabel")}</em>
          <s className="decoration-signal decoration-2">{c("draft")}</s>
        </p>
        <p className="font-display mb-8 mt-[18px] text-[clamp(28px,2.6vw,38px)] leading-[0.98]!">{c("final")}</p>

        <div className="mt-auto flex flex-wrap-reverse items-end justify-between gap-x-3 gap-y-2 border-t border-line pt-4">
          <p className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.06em] text-fg-dim">
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
