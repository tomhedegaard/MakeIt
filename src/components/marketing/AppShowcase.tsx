import Container from "@/components/Container";

/**
 * Section showing what the platform actually looks like — three phone
 * mock-ups of the key surfaces (Today, Active session, Form-check
 * verdict). Built with the same design tokens as the real app so the
 * preview stays in sync.
 */
export default function AppShowcase() {
  return (
    <section id="app" className="relative border-t hairline py-24 md:py-40">
      <Container>
        <div className="max-w-2xl mb-16" data-reveal>
          <div className="eyebrow mb-4">06 — Appen</div>
          <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92] mb-5">
            Sådan ser det ud.
          </h2>
          <p className="text-lg md:text-xl text-fg-dim leading-relaxed max-w-xl">
            Tre skærme der definerer din uge — fra du tager telefonen op om
            morgenen til AI&apos;en har vurderet dit tunge sæt.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Phone label="Today" detail="Dagens session, ét tap til start" delay={0}>
            <TodayScreen />
          </Phone>
          <Phone label="Aktiv session" detail="Sæt-for-sæt med RPE og rest-timer" delay={120}>
            <SessionScreen />
          </Phone>
          <Phone label="Form-check" detail="Claude vurderer på 6 sek." delay={240}>
            <FormCheckScreen />
          </Phone>
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * Phone frame
 * ---------------------------------------------------------------- */

function Phone({
  children,
  label,
  detail,
  delay,
}: {
  children: React.ReactNode;
  label: string;
  detail: string;
  delay: number;
}) {
  return (
    <div data-reveal style={{ transitionDelay: `${delay}ms` }} className="flex flex-col items-center">
      <div
        className="surface-2 rounded-[2.6rem] p-3 w-full max-w-[300px] mx-auto"
        style={{ boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)" }}
      >
        <div className="relative bg-bg rounded-[2rem] overflow-hidden aspect-[9/19]">
          {/* Notch */}
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full z-10"
            style={{ background: "var(--bg-2)" }}
            aria-hidden
          />
          <div className="absolute inset-0 pt-7 px-4 pb-4 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
      <div className="mt-5 text-center">
        <div className="eyebrow mb-1">{label}</div>
        <div className="text-xs text-fg-dim font-mono">{detail}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Mini-screens — pixel-light recreations using the same tokens
 * ---------------------------------------------------------------- */

function TodayScreen() {
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-dim font-mono">God morgen</div>
          <div className="font-display text-lg leading-none mt-0.5">@anton</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-faint font-mono">Streak</div>
          <div className="numeric text-base">12</div>
        </div>
      </div>

      <div className="surface-2 rounded-xl p-3 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="size-1.5 rounded-full bg-fg" />
          <span className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim">
            STR-12 · uge 4
          </span>
        </div>
        <div className="font-display text-sm leading-tight mb-1">Dag A — Squat</div>
        <div className="text-[9px] text-fg-dim leading-snug mb-3">
          Top set @ RPE 8, 3×3 backoff
        </div>

        <div className="grid grid-cols-3 gap-px bg-line border hairline rounded mb-2">
          <Mini v="4" k="øvelser" />
          <Mini v="16" k="sæt" />
          <Mini v="65m" k="tid" />
        </div>

        <ul className="text-[9px] divide-y hairline mb-3">
          <Row>Back Squat</Row>
          <Row>Romanian DL</Row>
          <Row>Walking Lunge</Row>
          <Row>Knee Raise</Row>
        </ul>

        <div
          className="mt-auto rounded-full text-center py-2 font-mono text-[9px] tracking-[0.18em] uppercase font-medium"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          Start session →
        </div>
      </div>
    </div>
  );
}

function SessionScreen() {
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-center justify-between mb-3 text-[8px] font-mono uppercase tracking-[0.16em] text-fg-faint">
        <span>×</span>
        <span>STR-12 · uge 4</span>
        <span>4/16</span>
      </div>
      <div className="h-0.5 bg-bg-3 -mx-4 mb-3">
        <div className="h-full bg-fg" style={{ width: "25%" }} />
      </div>

      <div className="surface-2 rounded-xl p-3 mb-2">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[7px] tracking-[0.18em] uppercase text-fg-dim font-mono">Øvelse 1/4</div>
            <div className="font-display text-sm leading-tight">Back Squat</div>
          </div>
          <div className="text-right">
            <div className="numeric text-base leading-none">4/7</div>
            <div className="text-[7px] tracking-[0.18em] uppercase text-fg-dim font-mono">sæt</div>
          </div>
        </div>
        <div className="text-[8px] text-fg-dim leading-snug border-t hairline pt-2 mt-2">
          Bryst op, knæ ud, sid lavt og driv hårdt op.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-line border hairline rounded mb-2">
        <Mini v="150" k="kg" />
        <Mini v="3" k="reps" />
        <Mini v="8" k="rpe" />
      </div>

      <div className="surface-2 rounded-lg p-2 mb-1.5 flex items-center">
        <div className="size-7 surface-2 rounded flex items-center justify-center text-sm">−</div>
        <div className="flex-1 text-center">
          <div className="numeric text-base">150 <span className="text-fg-dim text-[8px]">kg</span></div>
          <div className="text-[7px] text-fg-dim font-mono uppercase tracking-[0.14em]">Vægt</div>
        </div>
        <div className="size-7 surface-2 rounded flex items-center justify-center text-sm">+</div>
      </div>

      <div className="flex gap-1 mb-2">
        {[7, 7.5, 8, 8.5, 9].map((r) => (
          <div
            key={r}
            className="flex-1 rounded-full text-center text-[8px] font-mono py-1 border hairline-strong"
            style={r === 8 ? { background: "var(--fg)", color: "var(--bg)" } : {}}
          >
            {r}
          </div>
        ))}
      </div>

      <div
        className="mt-auto rounded-full text-center py-2 font-mono text-[9px] tracking-[0.18em] uppercase font-medium"
        style={{ background: "var(--fg)", color: "var(--bg)" }}
      >
        Log sæt →
      </div>
    </div>
  );
}

function FormCheckScreen() {
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[7px] tracking-[0.18em] uppercase text-fg-dim font-mono">AI form-check</div>
          <div className="font-display text-sm leading-tight">
            Solid sæt — let knæ-valgus
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="numeric text-2xl leading-none">84</div>
          <div className="text-[7px] tracking-[0.18em] uppercase text-fg-dim font-mono">/ 100</div>
        </div>
      </div>

      <div className="text-[7px] text-fg-faint font-mono uppercase tracking-[0.16em] mb-2">
        Reviewed · Mikael Munk
      </div>

      <div className="surface-2 rounded-lg p-2 mb-1.5">
        <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
          ✓ Godt
        </div>
        <ul className="space-y-0.5 text-[9px] text-fg/90 leading-snug">
          <li>· Dybde ramt</li>
          <li>· Konsistent bar-path</li>
          <li>· God spinal kontrol</li>
        </ul>
      </div>

      <div className="surface-2 rounded-lg p-2 mb-1.5">
        <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
          △ Stram op
        </div>
        <ul className="space-y-0.5 text-[9px] text-fg/90 leading-snug">
          <li>· Højre knæ kollapser i bunden</li>
        </ul>
      </div>

      <div className="surface-2 rounded-lg p-2">
        <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
          Coach-tip
        </div>
        <p className="text-[9px] text-fg/90 leading-snug">
          Driv knæene udad — &ldquo;spread the floor&rdquo;.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Mini({ v, k }: { v: string; k: string }) {
  return (
    <div className="bg-bg-2 px-1 py-1 text-center">
      <div className="numeric text-[11px] leading-none">{v}</div>
      <div className="text-[7px] tracking-[0.14em] uppercase text-fg-dim font-mono mt-0.5">
        {k}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="py-1 flex items-center gap-2 text-[9px]">
      <span className="text-fg-faint">·</span>
      <span className="flex-1 text-fg/85">{children}</span>
    </li>
  );
}
