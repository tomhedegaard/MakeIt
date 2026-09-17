import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import DashboardScreen from "./screens/DashboardScreen";
import SessionScreen from "./screens/SessionScreen";
import FormCheckScreen from "./screens/FormCheckScreen";
import DecisionScreen from "./screens/DecisionScreen";

describe("marketing phone screens", () => {
  it("dashboard shows the rewritten top set as an image with a description", () => {
    const html = render(<DashboardScreen />);
    expect(html).toContain('role="img"');
    expect(html).toMatch(/aria-label="[^"]*150[^"]*135[^"]*"/);
  });

  it("session screen is always Nat", () => {
    expect(render(<SessionScreen />)).toContain('data-theme="nat"');
  });

  it("form-check shows the member's own recording and a MoveKit reference, no drawn figure", () => {
    const html = render(<FormCheckScreen />);
    expect(html).toContain("/exercise-demos/back-squat");
    expect(html).toContain("Din optagelse");
    expect(html).toContain("<video"); // exercise visual is a real MoveKit loop
  });

  it("decision offers Behold original and the why-chips (A2, C1)", () => {
    const html = render(<DecisionScreen />);
    expect(html).toContain("Behold original");
    expect(html).toMatch(/Søvn[\s\S]*HRV[\s\S]*Stress/);
  });
});
