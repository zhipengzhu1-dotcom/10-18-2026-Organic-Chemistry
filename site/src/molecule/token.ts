/** A design token's value read from the page, for three.js materials that can't take a CSS var; `fallback` off the page. */
export function token(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
