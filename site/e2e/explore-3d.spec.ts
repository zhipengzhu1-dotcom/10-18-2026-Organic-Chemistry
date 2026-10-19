// Explore in 3D (#71): Steps and Problems that name a molecule offer a full-screen spin/zoom
// view with our cited colours and radii. It is the 3D Step card's viewer (#68), grown to fill
// the screen; three.js loads only when a 3D view first draws.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_LESSON } from "./site.ts";

const exploreButton = (page: Page) => page.getByRole("button", { name: "Explore in 3D" });
const dialog = (page: Page, name: string) => page.getByRole("dialog", { name: `${name} in 3D` });
const view = (page: Page, name: string) => dialog(page, name).getByRole("application", { name: new RegExp(name) });

/** The bodies of every script the page fetches, from now on. */
function scripts(page: Page): string[] {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (r.request().resourceType() === "script" || r.url().endsWith(".js")) bodies.push(await r.text().catch(() => ""));
  });
  return bodies;
}
const hasThree = (bodies: string[]) => bodies.some((b) => b.includes("MeshMatcapMaterial"));

test("three.js loads only when Explore in 3D is pressed, not with the page", async ({ page }) => {
  const bodies = scripts(page);
  await page.goto(`${SAMPLE_LESSON}#s02`);
  await expect(exploreButton(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(hasThree(bodies)).toBe(false);

  await exploreButton(page).click();
  await expect(dialog(page, "Methane").locator("canvas")).toBeVisible();
  expect(hasThree(bodies)).toBe(true);
});

test("keyboard: open, switch to true scale, turn, zoom and reset, then Esc closes and focus returns", async ({ page }) => {
  await page.goto(`${SAMPLE_LESSON}#s02`);
  await exploreButton(page).focus();
  await page.keyboard.press("Enter");

  const d = dialog(page, "Methane");
  await expect(d).toBeVisible();
  await expect(d.locator("canvas")).toBeVisible();
  // The molecule in words.
  await expect(d.locator(".explore-words")).toContainText("Methane: 5 atoms. C1 is bonded to H1, H2, H3 and H4.");

  const ball = d.getByRole("button", { name: "Ball & stick" });
  const full = d.getByRole("button", { name: "True scale" });
  await expect(ball).toHaveAttribute("aria-pressed", "true");
  await full.focus();
  await page.keyboard.press("Enter");
  await expect(full).toHaveAttribute("aria-pressed", "true");
  await expect(ball).toHaveAttribute("aria-pressed", "false");

  const said = d.locator("[aria-live]");
  await view(page, "Methane").focus();
  await page.keyboard.press("ArrowRight");
  await expect(said).toHaveText("Turned right.");
  await page.keyboard.press("+");
  await expect(said).toHaveText("Zoomed in.");
  await page.keyboard.press("0");
  await expect(said).toHaveText("View reset.");

  await page.keyboard.press("Escape");
  await expect(d).toBeHidden();
  await expect(exploreButton(page)).toBeFocused();

  // The close button works too.
  await exploreButton(page).click();
  await dialog(page, "Methane").getByRole("button", { name: "Close 3D view" }).click();
  await expect(dialog(page, "Methane")).toBeHidden();
});

test("the view's Source note names the geometry, colour and radius sources", async ({ page }) => {
  await page.goto(`${SAMPLE_LESSON}#s02`);
  await exploreButton(page).click();
  const d = dialog(page, "Methane");
  await d.getByText("ⓘ Where these numbers come from").click();
  await expect(d.getByText("Geometry: experimental (gas phase).")).toBeVisible();
  await expect(d.getByText(/C–H 1\.087 Å from E Hirota/)).toBeVisible();
  await expect(d.getByText(/C colour #909090 and H colour #FFFFFF from the Jmol CPK colour table/)).toBeVisible();
  await expect(d.getByText(/C van der Waals radius 1\.7 Å and H van der Waals radius 1\.2 Å from Bondi/)).toBeVisible();
  await expect(d.getByText(/Data derived from NIST CCCBDB/)).toBeVisible();
});

test("a Check Step's Problem that names a molecule offers it, and the open view passes axe", async ({ page }) => {
  await page.goto(`${SAMPLE_LESSON}#s08`);
  await expect(page.getByText("Step 8 of 10")).toBeVisible();
  await exploreButton(page).click();
  const d = dialog(page, "Ethylene");
  await expect(d.locator("canvas")).toBeVisible();
  await expect(d.locator(".explore-words")).toContainText("C1 is bonded to C2 (double), H1 and H2.");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);

  // The design system's rules (#59) inside the dialog: 16px text minimum, numbers in the data face, 48px targets.
  await d.getByText("ⓘ Where these numbers come from").click();
  const broken = await d.evaluate((root) => {
    const out: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!;
      const text = n.textContent!.trim();
      // SVG drawing labels (atom letters, measurement tags) are sized in drawing units.
      if (!text || el.closest(".sr, svg") || !el.getBoundingClientRect().width) continue;
      const cs = getComputedStyle(el);
      if (parseFloat(cs.fontSize) < 16) out.push(`"${text}" under 16px`);
      if (/[0-9]/.test(text) && !cs.fontFamily.startsWith('"JetBrains Mono')) out.push(`"${text}" outside the data face`);
    }
    for (const el of root.querySelectorAll("button, summary")) {
      const box = el.getBoundingClientRect();
      if (box.width < 48 || box.height < 48) out.push(`${el.outerHTML.slice(0, 60)} is under 48px`);
    }
    return out;
  });
  expect(broken).toEqual([]);
});

test("a Step that names no molecule has no Explore button", async ({ page }) => {
  await page.goto(`${SAMPLE_LESSON}#s04`);
  await expect(page.getByText("Step 4 of 10")).toBeVisible();
  await expect(exploreButton(page)).toHaveCount(0);
});
