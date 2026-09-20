import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Modal } from "./Modal";

const src = readFileSync(new URL("./Modal.tsx", import.meta.url), "utf8");

describe("Modal", () => {
  it("renders nothing while closed", () => {
    expect(renderToStaticMarkup(<Modal open={false} onOpenChange={() => {}} title="Tur"><p>Hej</p></Modal>)).toBe("");
  });

  // Radix renders through a portal, which needs a document; the suite
  // runs in node, so the contract is asserted on the source instead.
  it("is built on the Radix dialog that traps focus and closes on Escape", () => {
    expect(src).toContain('from "@radix-ui/react-dialog"');
    expect(src).toMatch(/<Dialog\.Portal>/);
    expect(src).toMatch(/<Dialog\.Overlay/);
    expect(src).toMatch(/<Dialog\.Title/);
    expect(src).toMatch(/<Dialog\.Description/);
  });

  it("names the dialog for screen readers from the title prop", () => {
    expect(src).toMatch(/className="sr-only">\{title\}<\/Dialog\.Title>/);
  });
});
