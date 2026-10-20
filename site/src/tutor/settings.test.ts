// The Tutor's picker value (ticket #106): one `model|effort` string, written and read in settings.ts.
import { describe, expect, it } from "vitest";
import { pairOf, parsePick } from "./settings.ts";

describe("the model and effort pick", () => {
  it("reads back the model and effort it was written from", () => {
    expect(parsePick(pairOf("claude-opus-5-5", "high"))).toEqual({ model: "claude-opus-5-5", effort: "high" });
  });

  it("is empty before the route's choices arrive, so the route's default runs", () => {
    expect(parsePick("")).toEqual({});
  });
});
