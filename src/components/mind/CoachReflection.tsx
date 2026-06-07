/**
 * Daily AI mental coach output renderer. Three H2 sections —
 * "Det jeg ser hos dig i dag" / "Et spørgsmål til dig" /
 * "En lille ting at gøre i dag" — rendered as hero typography.
 *
 * Source-agnostic: same render for Claude output, fallback template,
 * or a coach-authored note in v1.
 */
export default function CoachReflection({ bodyMd }: { bodyMd: string }) {
  const sections = splitOnH2(bodyMd);

  return (
    <article className="space-y-8 rounded-2xl border hairline bg-bg-2/30 p-6 md:p-8">
      <div className="eyebrow">Mind-coach · i dag</div>
      {sections.map((sec, i) => (
        <section key={i} className="space-y-2">
          {sec.heading ? (
            <h3 className="font-display text-xl md:text-2xl">{sec.heading}</h3>
          ) : null}
          <p className="text-fg-dim leading-relaxed whitespace-pre-wrap text-base md:text-lg">
            {sec.body}
          </p>
        </section>
      ))}
    </article>
  );
}

interface Section {
  heading: string | null;
  body: string;
}

function splitOnH2(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const out: Section[] = [];
  let curr: Section | null = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      if (curr) out.push(curr);
      curr = { heading: m[1] ?? null, body: "" };
    } else {
      if (!curr) curr = { heading: null, body: "" };
      curr.body += (curr.body ? "\n" : "") + line;
    }
  }
  if (curr) out.push(curr);
  return out
    .map((s) => ({ heading: s.heading, body: s.body.trim() }))
    .filter((s) => s.body.length > 0 || s.heading);
}
