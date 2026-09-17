import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Card from "./Card";
import SectionHeader from "./SectionHeader";
import PageTitle from "./PageTitle";
import PageHeader from "@/components/app/PageHeader";

describe("Card", () => {
  it("is a quiet token surface by default", () => {
    const html = renderToStaticMarkup(<Card>x</Card>);
    expect(html).toContain('data-card="quiet"');
    expect(html).toMatch(/class="[^"]*bg-bg-2[^"]*rounded-\[14px\][^"]*p-5/);
  });

  it("marks the primary card and scopes a domain", () => {
    const html = renderToStaticMarkup(<Card variant="primary" domain="body" as="section">x</Card>);
    expect(html).toMatch(/^<section/);
    expect(html).toContain('data-card="primary"');
    expect(html).toContain('data-domain="body"');
    expect(html).toContain("border-line-strong");
  });

  it("passes data- and aria-attributes through", () => {
    const html = renderToStaticMarkup(
      <Card data-dashboard="todaySession" aria-label="Dagens session" className="p-0">x</Card>,
    );
    expect(html).toContain('data-dashboard="todaySession"');
    expect(html).toContain('aria-label="Dagens session"');
    expect(html).not.toMatch(/\bp-5\b/); // twMerge drops p-5 for p-0
  });
});

describe("SectionHeader", () => {
  it("renders a domain eyebrow, a heading and an optional link", () => {
    const html = renderToStaticMarkup(
      <SectionHeader eyebrow="Krop" title="Kommende" href="/coaching" linkLabel="Se alle" id="up" />,
    );
    expect(html).toContain("eyebrow eyebrow-domain");
    expect(html).toContain('<h2 id="up"');
    expect(html).toContain('href="/coaching"');
    expect(html).toContain("Se alle");
  });

  it("omits the link without href", () => {
    expect(renderToStaticMarkup(<SectionHeader title="X" />)).not.toContain("<a");
  });

  it("merges a className so callers can override the default mb-4 (twMerge semantics)", () => {
    const html = renderToStaticMarkup(<SectionHeader title="X" className="mb-0" />);
    expect(html).not.toMatch(/\bmb-4\b/);
    expect(html).toMatch(/\bmb-0\b/);
  });

  it("lets callers add layout classes like justify-center without dropping the base row classes", () => {
    const html = renderToStaticMarkup(<SectionHeader title="X" className="justify-center" />);
    expect(html).toContain("justify-center");
    expect(html).not.toMatch(/\bjustify-between\b/);
    expect(html).toMatch(/\bflex\b/);
    expect(html).toMatch(/\bitems-end\b/);
  });
});

describe("PageTitle", () => {
  it("has one h1 and two sizes", () => {
    const page = renderToStaticMarkup(<PageTitle title="I dag" kicker="Tirsdag" />);
    const compact = renderToStaticMarkup(<PageTitle title="Mad" size="compact" />);
    expect(page.match(/<h1/g)).toHaveLength(1);
    expect(page).toContain('data-size="page"');
    expect(compact).toContain('data-size="compact"');
    expect(page).toContain("font-display");
  });

  it("renders a div, not a header (call sites wrap it in <header> themselves)", () => {
    const html = renderToStaticMarkup(<PageTitle title="I dag" />);
    expect(html).not.toMatch(/^<header/);
    expect(html).toMatch(/^<div/);
  });

  it("wraps so a wide action drops below the title instead of squeezing it (spec §6)", () => {
    const html = renderToStaticMarkup(
      <PageTitle title="Reps" action={<div className="min-w-[220px]">Saldo</div>} />,
    );
    expect(html).toMatch(/class="[^"]*flex-wrap[^"]*items-end[^"]*justify-between[^"]*"/);
    expect(html).toMatch(/class="[^"]*min-w-0[^"]*flex-1[^"]*basis-48[^"]*"/);
    expect(html).toContain('class="shrink-0 max-w-full"');
  });

  it("caps a wide action at the viewport so it wraps instead of clipping (Kost action row)", () => {
    // /nutrition hands PageTitle three buttons whose natural width is wider
    // than a 390px phone. shrink-0 alone kept them at max-content and the
    // last link ended up off-screen with no way to scroll to it.
    const html = renderToStaticMarkup(
      <PageTitle
        title="Kost"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button">Log</button>
            <a href="/nutrition/shopping">Indkøbsliste</a>
            <a href="/nutrition/preferences">Indstillinger</a>
          </div>
        }
      />,
    );
    expect(html).toContain('class="shrink-0 max-w-full"');
    expect(html).toContain("flex flex-wrap items-center gap-2");
  });
});

describe("PageHeader", () => {
  it("PageHeader renders through PageTitle's single scale", () => {
    const html = renderToStaticMarkup(<PageHeader eyebrow="Træn" title="Øvelser" subtitle="Alle løft" />);
    expect(html).toContain('data-size="page"');
    expect(html).toContain("Alle løft");
    expect(html).not.toContain("4.5rem");
  });
});
