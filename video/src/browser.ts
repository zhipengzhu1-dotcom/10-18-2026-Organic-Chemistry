// The browser Remotion renders in. Software GL (SwiftShader via ANGLE) gives the same pixels on a
// laptop and on CI with no GPU; Remotion's default GL left the root component loading forever on
// macOS. REMOTION_BROWSER_EXECUTABLE points it at a local browser (e.g. Playwright's headless
// Chrome) when Remotion's own download isn't usable on a machine.
export interface BrowserOptions {
  chromiumOptions: { gl: "swangle" };
  browserExecutable?: string;
}

export function browserOptions(env: Record<string, string | undefined> = process.env): BrowserOptions {
  const executable = env.REMOTION_BROWSER_EXECUTABLE?.trim();
  return { chromiumOptions: { gl: "swangle" }, ...(executable ? { browserExecutable: executable } : {}) };
}
