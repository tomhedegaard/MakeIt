import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";
import Stat from "./Stat";
import Field from "./Field";

describe("EmptyState", () => {
  it("says one thing and offers one action", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Intet pas endnu" body="Vælg et program." actionHref="/coaching" actionLabel="Vælg program" />,
    );
    expect(html).toContain("data-empty-state");
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain("btn btn-primary");
  });

  it("gives the empty region a heading", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Intet pas endnu" body="Vælg et program." actionHref="/coaching" actionLabel="Vælg program" />,
    );
    expect(html).toMatch(/<h2 class="font-display text-xl">Intet pas endnu<\/h2>/);
  });

  it("passes data-attributes through so the connected dashboard can target it", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Intet pas endnu"
        body="Vælg et program."
        actionHref="/coaching"
        actionLabel="Vælg program"
        data-today-empty=""
      />,
    );
    expect(html).toContain("data-today-empty");
  });
});

describe("Stat", () => {
  it("shows a mono value and a monochrome delta with an arrow", () => {
    const html = renderToStaticMarkup(<Stat label="Volumen" value="18.420" unit="kg" delta={4} />);
    expect(html).toContain("font-mono");
    expect(html).toContain("tabular-nums");
    expect(html).toMatch(/↑\s*4/);
    expect(html).not.toMatch(/text-(ok|warn|danger)/);
  });
});

describe("Field", () => {
  it("puts the label above, wires hint and error, and never uses the placeholder as label", () => {
    const html = renderToStaticMarkup(
      <Field id="email" name="email" label="Email" type="email" hint="Vi deler den ikke" error="Ugyldig" />,
    );
    expect(html).toMatch(/<label[^>]*for="email"[^>]*>Email<\/label>[\s\S]*<input/);
    expect(html).toContain('aria-describedby="email-hint email-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/autoComplete="email"/i);
    expect(html).toMatch(/inputMode="email"/i);
    expect(html).toContain("field");
  });
});
