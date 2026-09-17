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
});

describe("PageHeader", () => {
  it("PageHeader renders through PageTitle's single scale", () => {
    const html = renderToStaticMarkup(<PageHeader eyebrow="Træn" title="Øvelser" subtitle="Alle løft" />);
    expect(html).toContain('data-size="page"');
    expect(html).toContain("Alle løft");
    expect(html).not.toContain("4.5rem");
  });
});
