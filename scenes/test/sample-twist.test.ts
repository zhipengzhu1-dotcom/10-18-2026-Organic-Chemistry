import { describe, expect, it } from "vitest";
import { sampleTwist } from "../src/sample-twist/manifest.ts";
import { seededRandom } from "../src/motion.ts";

describe("sample-twist screen-reader text", () => {
  it("says what the overlap bar shows at each kind of twist", () => {
    expect(sampleTwist.describe({ twist: 0 }, 0, {})).toContain("parallel: full side-on overlap");
    expect(sampleTwist.describe({ twist: 90 }, 0, {})).toContain("perpendicular: no side-on overlap");
    expect(sampleTwist.describe({ twist: 180 }, 0, {})).toContain("parallel, one flipped,");
    expect(sampleTwist.describe({ twist: 60 }, 0, {})).toContain("about 50 percent full");
  });
});

describe("seeded randomness", () => {
  it("gives the same sequence for the same seed, and a different one for another seed", () => {
    const draw = (seed: number) => Array.from({ length: 3 }, seededRandom(seed));
    expect(draw(7)).toEqual(draw(7));
    expect(draw(7)).not.toEqual(draw(8));
    for (const x of draw(7)) expect(x >= 0 && x < 1).toBe(true);
  });
});
