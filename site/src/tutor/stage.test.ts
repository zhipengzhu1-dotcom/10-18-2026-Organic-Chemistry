// Ringing an atom (#107): only if the atom the Tutor was shown is still at that index, and never on
// the look-only target. The DOM side of stage.ts is checked by hand.
import { describe, expect, it } from "vitest";
import type { Stage } from "./context.ts";
import { ringable } from "./stage.ts";

const sent: Stage["atoms"] = [
  { label: "O", in: "working drawing" },
  { label: "C", in: "working drawing" },
  { label: "Br", in: "target (look only)" },
];

describe("ringable", () => {
  it("rings an atom still where it was when the question was sent", () => {
    expect(ringable(1, sent, sent)).toBe(true);
  });

  it("skips an index that now points at another atom or drawing (the stage changed while the reply was written)", () => {
    expect(ringable(1, sent, [{ label: "N", in: "working drawing" }, { label: "O", in: "working drawing" }])).toBe(false);
    expect(ringable(0, sent, [{ label: "O", in: "figure" }])).toBe(false);
    expect(ringable(1, sent, [{ label: "O", in: "working drawing" }])).toBe(false);
  });

  it("never rings the target (look only)", () => {
    expect(ringable(2, sent, sent)).toBe(false);
  });
});
