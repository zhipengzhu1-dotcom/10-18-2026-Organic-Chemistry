// The Remotion root renders Scenes with the site's own tokens and fonts (story 93: numbers and
// formulas in JetBrains Mono), and the renderer can be pointed at a local browser.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { browserOptions } from "../src/browser.ts";

const root = readFileSync(new URL("../src/remotion/Root.tsx", import.meta.url), "utf8");

describe("the Remotion root", () => {
  it("loads the site's tokens.css and its two self-hosted fonts, not copied values", () => {
    expect(root).toMatch(/import ".*site\/src\/styles\/tokens\.css";/);
    expect(root).toContain('import "@fontsource-variable/jetbrains-mono/index.css";');
    expect(root).toContain('import "@fontsource-variable/space-grotesk/index.css";');
    expect(root).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("holds every frame until both fonts have loaded", () => {
    expect(root).toMatch(/delayRender\(/);
    expect(root).toMatch(/continueRender\(/);
  });
});

describe("browserOptions", () => {
  it("uses software GL, and Remotion's own browser unless REMOTION_BROWSER_EXECUTABLE names one", () => {
    expect(browserOptions({})).toEqual({ chromiumOptions: { gl: "swangle" } });
    expect(browserOptions({ REMOTION_BROWSER_EXECUTABLE: "/opt/chrome" })).toEqual({
      chromiumOptions: { gl: "swangle" },
      browserExecutable: "/opt/chrome",
    });
  });
});
