// How a lobe looks (Lesson 4 and Lesson 8): its pen ink (blue or orange, the Paper Notebook names)
// and whether it is hatched.
import { describe, expect, it } from "vitest";
import { lobeLook } from "./OrbitalLobes.tsx";

describe("lobeLook", () => {
  it("draws σ orange and π blue, the − lobe hatched (Lesson 4)", () => {
    expect(lobeLook("sigma", "+")).toEqual({ colour: "orange", hatched: false });
    expect(lobeLook("pi", "-")).toEqual({ colour: "blue", hatched: true });
  });

  it("draws + solid blue and − hatched orange (Lesson 8)", () => {
    expect(lobeLook(undefined, "+")).toEqual({ colour: "blue", hatched: false });
    expect(lobeLook(undefined, "-")).toEqual({ colour: "orange", hatched: true });
  });

  it("never hatches a density surface", () => {
    expect(lobeLook(undefined, "-", true)).toEqual({ colour: "orange", hatched: false });
  });
});
