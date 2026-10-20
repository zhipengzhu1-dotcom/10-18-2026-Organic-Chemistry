// Draw arrows' in-between flags and the shown push are orange and dashed (Lesson 6 spec: "orange ring
// on C2"; #72: the shown push is an "orange dashed arrow"), never colour alone.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("./structure.css", import.meta.url), "utf8");
const rule = (selector: string) => css.match(new RegExp(`${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

it("flag rings, the flag list and the shown push are orange (--at-ignite) and dashed", () => {
  expect(rule(".flag-ring")).toMatch(/stroke: var\(--at-ignite\).*stroke-dasharray/s);
  expect(rule(".arrow-flags")).toMatch(/dashed var\(--at-ignite\)/);
  expect(rule(".push-arrow.shown")).toMatch(/stroke: var\(--at-ignite\); stroke-dasharray/);
  expect(rule(".arrowhead.shown")).toMatch(/fill: var\(--at-ignite\)/);
});
