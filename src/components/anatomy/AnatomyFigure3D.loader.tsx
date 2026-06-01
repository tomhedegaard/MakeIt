"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type AnatomyFigure3D from "./AnatomyFigure3D";

const Loaded = dynamic(() => import("./AnatomyFigure3D"), {
  ssr: false,
  loading: () => (
    <div className="surface-2 rounded-2xl flex items-center justify-center w-full h-full">
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
        Loading 3D…
      </span>
    </div>
  ),
});

export default function AnatomyFigure3DLoader(
  props: ComponentProps<typeof AnatomyFigure3D>,
) {
  return <Loaded {...props} />;
}
