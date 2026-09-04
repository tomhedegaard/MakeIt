import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NeedsAttentionStrip, {
  type NeedsAttentionCopy,
} from "./NeedsAttentionStrip";
import { demoNeedsAttention } from "@/lib/coach/needs-attention";

const COPY: NeedsAttentionCopy = {
  eyebrow: "Kræver dig",
  title: "Needs Attention",
  open: "Åbn",
  buckets: {
    sprunget: { label: "Sprunget", empty: "Ingen sprunget pas." },
    afventer_form: { label: "Afventer form", empty: "Ingen film venter." },
    engine: { label: "Engine", empty: "Ingen flag fra motoren." },
  },
};

describe("NeedsAttentionStrip", () => {
  it("renders three buckets with deep-links and quiet empties", () => {
    const html = renderToStaticMarkup(
      createElement(NeedsAttentionStrip, {
        model: demoNeedsAttention(),
        copy: COPY,
      }),
    );
    expect(html).toContain("data-needs-attention");
    expect(html).toContain('data-needs-bucket="sprunget"');
    expect(html).toContain('data-needs-bucket="afventer_form"');
    expect(html).toContain('data-needs-bucket="engine"');
    expect(html).toContain("Sprunget");
    expect(html).toContain("Afventer form");
    expect(html).toContain("Engine");
    expect(html).toContain("/coach/members/m-anders");
    expect(html).toContain("/coach/queue#form-");
    expect(html).toContain("/coach/queue#engine-");
    expect(html).not.toMatch(/compliance/i);
    expect(html).not.toMatch(/churn/i);
  });

  it("uses quiet empty states when a bucket has no rows", () => {
    const html = renderToStaticMarkup(
      createElement(NeedsAttentionStrip, {
        model: { sprunget: [], afventerForm: [], engine: [] },
        copy: COPY,
      }),
    );
    expect(html).toContain('data-needs-empty="sprunget"');
    expect(html).toContain("Ingen sprunget pas.");
    expect(html).toContain("Ingen film venter.");
    expect(html).toContain("Ingen flag fra motoren.");
  });
});
