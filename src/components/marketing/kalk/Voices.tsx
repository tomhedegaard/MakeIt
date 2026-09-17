import { useTranslations } from "next-intl";

type Voice = { quote: string; name: string; tier: string; since: string };

/**
 * Voices (reference A `.voices`): one big quote and two small ones.
 * D6 is undecided, so the section stays hidden behind
 * `Marketing.kalk.voices.enabled` until Tom has real member quotes to
 * publish — flipping the flag is the only change needed once
 * `kalk.voices.items` exists.
 */
export default function Voices() {
  const t = useTranslations("Marketing.kalk.voices");
  if (t("enabled") !== "true") return null;

  const [big, ...small] = t.raw("items") as Voice[];

  return (
    <section id="voices" aria-labelledby="voices-heading" className="scroll-mt-[68px] pb-[clamp(72px,8vw,128px)]">
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <h2 id="voices-heading" className="font-display text-[clamp(46px,6.4vw,96px)]">
          {t("heading")}
        </h2>

        <div className="mt-10 grid border-t border-line-strong lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:grid-rows-2">
          <VoiceCard voice={big} big />
          {small.map((voice) => (
            <VoiceCard key={voice.name} voice={voice} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VoiceCard({ voice, big = false }: { voice: Voice; big?: boolean }) {
  return (
    <figure
      className={
        big
          ? "flex flex-col justify-between border-b border-line py-9 lg:row-span-2 lg:border-b-0 lg:border-r lg:py-14 lg:pr-16"
          : "border-b border-line py-9 last:border-b-0 lg:border-b lg:pl-11 lg:last:border-b-0"
      }
    >
      <blockquote className="m-0">
        <p
          className={
            big
              ? "font-display max-w-[20ch] text-[clamp(30px,4.2vw,64px)] leading-[1.08] tracking-[-0.03em]"
              : "text-[clamp(20px,1.8vw,26px)] font-medium leading-[1.28] tracking-[-0.015em]"
          }
        >
          {voice.quote}
        </p>
      </blockquote>
      <figcaption className="mt-5 flex flex-wrap gap-x-3.5 gap-y-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-fg-dim">
        <b className="font-medium text-fg">{voice.name}</b>
        <span>{voice.tier}</span>
        <span>{voice.since}</span>
      </figcaption>
    </figure>
  );
}
