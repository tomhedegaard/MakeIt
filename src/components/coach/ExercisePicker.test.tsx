import { describe, expect, it } from "vitest";
import { render } from "../marketing/test-render";
import ExercisePicker from "./ExercisePicker";

const library = [
  { id: "3", name: "Tempo Run", category: "cardio" },
  { id: "1", name: "Back Squat", category: "lower-body" },
  { id: "2", name: "Air Squat", category: "lower-body" },
  { id: "4", name: "Mystery Move", category: "odd" },
  { id: "5", name: "Coach Draft", category: null },
];
const props = { onChange: () => {}, emptyLabel: "Ingen øvelser i bibliotek", uncategorisedLabel: "Uden kategori" };

describe("ExercisePicker", () => {
  it("groups the options by category in taxonomy order with translated labels", () => {
    const html = render(<ExercisePicker value="1" library={library} {...props} />);
    const order = ["Ben", "Kondition", "odd", "Uden kategori"].map((l) => html.indexOf(`<optgroup label="${l}">`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("sorts names inside a group and marks the chosen exercise", () => {
    const html = render(<ExercisePicker value="1" library={library} {...props} />);
    expect(html.indexOf("Air Squat")).toBeLessThan(html.indexOf("Back Squat"));
    expect(html).toContain('<option value="1" selected="">Back Squat</option>');
  });

  it("shows the empty label when the library is empty", () => {
    const html = render(<ExercisePicker value={null} library={[]} {...props} />);
    expect(html).toContain('<option value="" selected="">Ingen øvelser i bibliotek</option>');
    expect(html).not.toContain("<optgroup");
  });
});
