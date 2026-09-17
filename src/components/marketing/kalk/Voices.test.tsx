import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import Voices from "./Voices";

describe("Voices", () => {
  it("renders nothing while D6 is undecided (voices.enabled is \"false\")", () => {
    expect(render(<Voices />)).toBe("");
  });
});
