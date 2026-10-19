// Explore in 3D (#71): Steps and Problems that name a molecule offer a full-screen
// spin/zoom view, drawn by 3Dmol.js with our cited colours and radii.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_LESSON } from "./site.ts";

const exploreButton = (page: Page) => page.getByRole("button", { name: "Explore in 3D" });
const dialog = (page: Page, name: string) => page.getByRole("dialog", { name: `${name} in 3D` });
const view = (page: Page) => page.getByRole("application", { name: /3D view/ });

/** The bodies of every script the page fetches, from now on. */
function scripts(page: Page): string[] {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (r.request().resourceType() === "script" || r.url().endsWith(".js")) bodies.push(await r.text().catch(() => ""));
  });
  return bodies;
}
const has3Dmol = (bodies: string[]) => bodies.some((b) => b.includes("createViewer"));

test("3Dmol.js loads only when Explore in 3D is pressed, not with the page", async ({ page }) => {
  const bodies = scripts(page);
  await page.goto(`${SAMPLE_LESSON}#s02`);
  await expect(exploreButton(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(has3Dmol(bodies)).toBe(false);

  await exploreButton(page).click();
  await expect(dialog(page, "Methane").locator("canvas")).toBeVisible();
  expect(has3Dmol(bodies)).toBe(true);
});

test("keyboard: open, switch to space-filling, rotate and zoom, then Esc closes and focus returns", async ({ page }) => {
  await page.goto(`${SAMPLE_LESSON}#s02`);
  await exploreButton(page).focus();
  await page.keyboard.press("Enter");

  const d = dialog(page, "Methane");
  await expect(d).toBeVisible();
  await expect(d.locator("canvas")).toBeVisible();
  // Screen readers get the molecule in words.
  await expect(view(page)).toHaveAccessibleDescription(/Methane: 1 carbon and 4 hydrogens\. The carbon is bonded to 4 hydrogens\./);

  const ball = d.getByRole("button", { name: "Ball and stick" });
  const space = d.getByRole("button", { name: "Space-filling" });
  await expect(ball).toHaveAttribute("aria-pressed", "true");
  await space.focus();
  await page.keyboard.press("Enter");
  await expect(space).toHaveAttribute("aria-pressed", "true");
  await expect(ball).toHaveAttribute("aria-pressed", "false");
  await expect(d.getByRole("status")).toHaveText("Space-filling: atoms at their van der Waals radii.");

  await view(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(d.getByRole("status")).toHaveText("Turned right.");
  await page.keyboard.press("+");
  await expect(d.getByRole("status")).toHaveText("Zoomed in.");
  await d.getByRole("button", { name: "Reset view" }).click();
  await expect(d.getByRole("status")).toHaveText("View reset.");

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

test("under reduced motion the view turns without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${SAMPLE_LESSON}#s02`);
  await exploreButton(page).click();
  await expect(view(page)).toHaveAttribute("data-animate-ms", "0");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await exploreButton(page).click();
  await expect(view(page)).not.toHaveAttribute("data-animate-ms", "0");
});

test("a Check Step's Problem that names a molecule offers it, and the open view passes axe", async ({ page }) => {
  await page.goto(`${SAMPLE_LESSON}#s08`);
  await expect(page.getByText("Step 8 of 10")).toBeVisible();
  await exploreButton(page).click();
  const d = dialog(page, "Ethylene");
  await expect(d.locator("canvas")).toBeVisible();
  await expect(view(page)).toHaveAccessibleDescription(/The carbon|Each carbon is bonded to 1 carbon \(double bond\) and 2 hydrogens\./);
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
      if (!text || el.closest(".sr") || !el.getBoundingClientRect().width) continue;
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
