import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/form", () => ({
  default: (props: ComponentProps<"form">) => <form {...props} />,
}));

const { default: LibraryFilterForm } = await import("./LibraryFilterForm");

const labels = {
  search: "Søg øvelse",
  placeholder: "Navn, fx squat",
  equipment: "Redskab",
  allEquipment: "Alle redskaber",
  submit: "Søg",
};
const equipmentOptions = [
  { value: "barbell", label: "Vægtstang" },
  { value: "dumbbell", label: "Håndvægt" },
];

describe("LibraryFilterForm", () => {
  it("is a GET form on the library with the applied search and equipment filled in", () => {
    const html = renderToStaticMarkup(
      <LibraryFilterForm q="squat" category="" equipment="barbell" equipmentOptions={equipmentOptions} labels={labels} />,
    );
    expect(html).toContain('action="/train/exercises"');
    expect(html).toContain('role="search"');
    expect(html).toMatch(/<input[^>]*type="search"[^>]*name="q"[^>]*value="squat"/);
    expect(html).toContain('maxLength="80"');
    expect(html).toContain('<option value="">Alle redskaber</option>');
    expect(html).toContain('<option value="barbell" selected="">Vægtstang</option>');
    expect(html).toContain('<option value="dumbbell">Håndvægt</option>');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Søg<\/button>/);
  });

  it("labels both fields", () => {
    const html = renderToStaticMarkup(
      <LibraryFilterForm q="" category="" equipment="" equipmentOptions={equipmentOptions} labels={labels} />,
    );
    expect(html).toMatch(/<label[^>]*>.*Søg øvelse.*<input/);
    expect(html).toMatch(/<label[^>]*>.*Redskab.*<select/);
  });

  it("carries the chosen category along, and only when one is chosen", () => {
    const withCategory = renderToStaticMarkup(
      <LibraryFilterForm q="" category="cardio" equipment="" equipmentOptions={equipmentOptions} labels={labels} />,
    );
    expect(withCategory).toContain('<input type="hidden" name="category" value="cardio"/>');
    const without = renderToStaticMarkup(
      <LibraryFilterForm q="" category="" equipment="" equipmentOptions={equipmentOptions} labels={labels} />,
    );
    expect(without).not.toContain('name="category"');
  });
});
