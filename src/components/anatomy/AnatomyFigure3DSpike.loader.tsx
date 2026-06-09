"use client";

import dynamic from "next/dynamic";

const AnatomyFigure3DSpike = dynamic(() => import("./AnatomyFigure3DSpike"), {
  ssr: false,
  loading: () => (
    <div
      className="surface-2 rounded-2xl flex items-center justify-center"
      style={{ width: 320, height: 360 }}
    >
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
        Loading 3D…
      </span>
    </div>
  ),
});

export default function AnatomyFigure3DSpikeLoader() {
  return <AnatomyFigure3DSpike />;
}
