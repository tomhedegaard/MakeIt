import type { ReactNode } from "react";
import AdaptiveReasonStrip, {
  type AdaptiveStripCopy,
} from "@/components/adaptive/AdaptiveReasonStrip";
import MotorGlyph from "@/components/adaptive/MotorGlyph";
import MunkMark from "@/components/brand/MunkMark";
import type { EngineStripModel } from "@/lib/adaptive/engine-strip";
import type { StreamMessage } from "@/lib/data/message-streams";
import DualStreamBubble from "./DualStreamBubble";

export type DualStreamCopy = {
  munkTitle: string;
  munkSub: string;
  motorTitle: string;
  motorSub: string;
  propose: string;
  voice: string;
};

/**
 * Two histories, two chrome languages.
 * Munk = name / monogram. Motor = glyph, @propose, no face.
 */
export default function DualStreamMessages({
  munk,
  motor,
  copy,
  strip,
  stripCopy,
  children,
}: {
  munk: StreamMessage[];
  motor: StreamMessage[];
  copy: DualStreamCopy;
  strip?: EngineStripModel | null;
  stripCopy?: AdaptiveStripCopy;
  /** Munk composer / live thread — Motor pane stays read-only. */
  children?: ReactNode;
}) {
  return (
    <div
      data-dual-stream=""
      className="grid gap-4 md:grid-cols-2"
    >
      <section
        data-stream="munk"
        className="surface-2 rounded-2xl overflow-hidden flex flex-col min-h-[280px]"
      >
        <header className="px-5 py-4 border-b hairline flex items-center gap-3">
          <MunkMark />
          <div className="min-w-0">
            <div className="text-sm leading-tight">{copy.munkTitle}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
              {copy.munkSub}
            </div>
          </div>
        </header>
        <ol className="flex-1 px-4 py-4 space-y-3">
          {munk.map((m) => (
            <DualStreamBubble key={m.id} message={m} copy={copy} />
          ))}
        </ol>
        {children}
      </section>

      <section
        data-stream="motor"
        className="surface-2 rounded-2xl overflow-hidden flex flex-col min-h-[280px]"
      >
        <header className="px-5 py-4 border-b hairline flex items-center gap-3">
          <MotorGlyph className="text-fg-dim" />
          <div className="min-w-0">
            <div className="text-sm leading-tight">{copy.motorTitle}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
              {copy.motorSub}
            </div>
          </div>
        </header>
        <ol className="flex-1 px-4 py-4 space-y-3">
          {motor.map((m) => (
            <DualStreamBubble key={m.id} message={m} copy={copy} />
          ))}
        </ol>
        {strip && stripCopy ? (
          <AdaptiveReasonStrip model={strip} copy={stripCopy} />
        ) : null}
      </section>
    </div>
  );
}
