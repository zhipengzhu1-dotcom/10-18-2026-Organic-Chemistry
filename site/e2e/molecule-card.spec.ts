// The 3D Step card and Rotate-and-identify 3D (#68) in the built site, on Lesson 3 (Molecules in 3D).
// Expected numbers come from the methane geometry (CCCBDB: C–H 1.087 Å, H–C–H 109.47°).
import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/molecules-in-3d";

const card = (page: Page) => page.locator("figure.molecule");
const frame = (page: Page) => page.getByRole("application", { name: /Methane/ });
const live = (page: Page) => card(page).locator("[aria-live]");
const readout = (page: Page) => card(page).locator(".molecule-readout");

/** Taps an atom where its letter is drawn. */
async function tapAtom(page: Page, index: number) {
  const box = (await card(page).locator(`.molecule-letter[data-atom="${index}"]`).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Lesson 3's tilted start view hides one H behind C; two quarter turns show all five atoms. */
async function showAllAtoms(page: Page) {
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Turn right" }).click();
  await expect(card(page).locator(".molecule-letter")).toHaveCount(5);
}

test.describe("the 3D Step card", () => {
  // A short laptop window (1280 × 720): the Step sits tighter so the card stays big enough to tap.
  test.use({ viewport: { width: 1280, height: 720 } });

  test("draws the molecule with WebGL, every atom lettered, a 1 Å scale bar and its Source note", async ({ page }) => {
    await page.goto(`${LESSON}#s03`);
    await expect(card(page).locator("canvas")).toHaveCount(1);
    await showAllAtoms(page);
    const letters = await card(page).locator(".molecule-letter").allTextContents();
    expect(letters.sort()).toEqual(["C", "H", "H", "H", "H"]);
    await expect(card(page).locator(".molecule-scalebar")).toHaveText("1 Å");
    await page.locator("details.source-note summary").click();
    const note = page.locator("details.source-note");
    await expect(note).toContainText("Geometry: experimental (gas phase).");
    await expect(note).toContainText("C–H 1.087 Å");
    await expect(note).toContainText("Bondi");
    await expect(note).toContainText("Jmol");
  });

  test("tap two atoms for a distance, three for the angle at the middle one; a fourth restarts; a picked atom un-picks", async ({
    page,
  }) => {
    await page.goto(`${LESSON}#s03`);
    await showAllAtoms(page);
    await tapAtom(page, 0);
    await expect(live(page)).toHaveText("C1 picked. Pick another atom.");
    await tapAtom(page, 1);
    await expect(readout(page)).toHaveText("1.09 Å C1–H1 bond");
    await expect(card(page).locator(".molecule-tag text")).toHaveText("1.09 Å");
    await expect(live(page)).toHaveText("C1 to H1: 1.09 ångströms, a bond.");

    await tapAtom(page, 1);
    await expect(live(page)).toHaveText("H1 un-picked.");
    await tapAtom(page, 2);
    await tapAtom(page, 3);
    // C1, H2, H3: the angle at the middle atom (H2).
    await expect(readout(page)).toContainText("C1–H2–H3 angle at H2");
    await tapAtom(page, 0);
    await expect(live(page)).toHaveText("C1 un-picked. H2 to H3: 1.78 ångströms, not bonded.");
    await tapAtom(page, 0);
    // H2, H3, C1: the angle at H3 (2 × 1.087 Å sides and the 1.775 Å base: 35.3°).
    await expect(readout(page)).toHaveText("35.3° H2–H3–C1 angle at H3");
    await tapAtom(page, 4);
    await expect(live(page)).toHaveText("H4 picked. Pick another atom.");
    await expect(card(page).locator(".molecule-pick")).toHaveCount(1);
    await tapAtom(page, 1);
    await expect(readout(page)).toHaveText("1.78 Å H4···H1 not bonded");
  });

  test("keyboard: [ / ] move between atoms, Enter picks, arrows turn, + and − zoom; the live region reads it", async ({ page }) => {
    await page.goto(`${LESSON}#s03`);
    await frame(page).focus();
    await page.keyboard.press("]");
    await expect(live(page)).toHaveText("C1, carbon.");
    await page.keyboard.press("Enter");
    await page.keyboard.press("]");
    await expect(live(page)).toHaveText("H1, hydrogen.");
    await page.keyboard.press("Enter");
    await expect(live(page)).toHaveText("C1 to H1: 1.09 ångströms, a bond.");
    await page.keyboard.press("[");
    await page.keyboard.press("[");
    await expect(live(page)).toHaveText("H4, hydrogen.");

    const at = () => card(page).locator('.molecule-letter[data-atom="1"]').getAttribute("x");
    const before = await at();
    await page.keyboard.press("ArrowRight");
    await expect.poll(at).not.toBe(before);

    const bar = card(page).locator(".molecule-scalebar i");
    const width = async () => (await bar.boundingBox())!.width;
    const w0 = await width();
    await page.keyboard.press("+");
    await expect.poll(width).toBeGreaterThan(w0);
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    await expect.poll(width).toBeLessThan(w0);
  });

  test("↺ / ↻ turn it; Ball & stick ⟷ True scale keeps the 1 Å bar; Describe reads the arrangement", async ({ page }) => {
    await page.goto(`${LESSON}#s03`);
    const at = async () => Number(await card(page).locator('.molecule-letter[data-atom="1"]').getAttribute("x"));
    // Read the start only once the card has its final size (fonts and the 3D chunk can still move the
    // layout just after load), and compare to a hundredth of a pixel (a turn and its undo round-trip in floats).
    await page.evaluate(() => document.fonts.ready);
    await expect(card(page).locator("canvas")).toHaveCount(1);
    let before = NaN;
    await expect.poll(async () => {
      const [a, b] = [await at(), (await page.waitForTimeout(200), await at())];
      before = b;
      return Math.abs(a - b);
    }).toBeLessThan(0.01);
    await page.getByRole("button", { name: "Turn right" }).click();
    await expect.poll(async () => Math.abs((await at()) - before)).toBeGreaterThan(1);
    await page.getByRole("button", { name: "Turn left" }).click();
    await expect.poll(async () => Math.abs((await at()) - before)).toBeLessThan(0.01);

    const bar = card(page).locator(".molecule-scalebar i");
    const w0 = (await bar.boundingBox())!.width;
    await page.getByRole("button", { name: "True scale" }).click();
    await expect(page.getByRole("button", { name: "True scale" })).toHaveAttribute("aria-pressed", "true");
    await expect(frame(page)).toHaveAccessibleName(/true scale/);
    expect((await bar.boundingBox())!.width).toBe(w0);

    await page.getByRole("button", { name: "Describe" }).click();
    await expect(live(page)).toContainText("Methane: 5 atoms. C1 is bonded to H1, H2, H3 and H4.");
  });

  // Spec #117: direct manipulation is never on the 20 fps grid, and nothing on the card loops.
  test("a drag turns it on every pointer move, at display rate; an idle card draws nothing", async ({ page }) => {
    // Count WebGL draw calls, to see when the canvas redraws.
    await page.addInitScript(() => {
      const w = window as unknown as { draws: number };
      w.draws = 0;
      for (const gl of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype] as unknown as Record<string, (...a: unknown[]) => unknown>[])
        for (const name of ["drawElements", "drawArrays"]) {
          const draw = gl[name];
          gl[name] = function (this: unknown, ...a: unknown[]) {
            w.draws++;
            return draw.apply(this, a);
          };
        }
    });
    await page.goto(`${LESSON}#s03`);
    await page.evaluate(() => document.fonts.ready);
    await expect(card(page).locator("canvas")).toHaveCount(1);
    const draws = () => page.evaluate(() => (window as unknown as { draws: number }).draws);
    // Settled: the canvas has drawn, and over the next half second it draws nothing more.
    await expect.poll(draws).toBeGreaterThan(0);
    await expect.poll(async () => {
      const a = await draws();
      await page.waitForTimeout(500);
      return (await draws()) - a;
    }).toBe(0);

    // Where every letter sits (an atom on the turn's axis alone wouldn't move).
    const at = () =>
      card(page)
        .locator(".molecule-letter")
        .evaluateAll((ls) => ls.map((l) => `${l.getAttribute("x")},${l.getAttribute("y")}`).join(" "));
    const box = (await frame(page).boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    let [x, drawn] = [await at(), await draws()];
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(box.x + 20 + 12 * i, box.y + box.height / 2);
      // Within two display frames the overlay and the canvas have both followed the pointer.
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const [x2, drawn2] = [await at(), await draws()];      expect(x2, `move ${i}`).not.toBe(x);
      expect(drawn2, `move ${i}`).toBeGreaterThan(drawn);
      [x, drawn] = [x2, drawn2];
    }
    await page.mouse.up();
    // Let go, it stops: no spin, no further frames.
    await page.waitForTimeout(200);
    const after = await draws();
    await page.waitForTimeout(500);
    expect(await draws()).toBe(after);
    await card(page).screenshot({ path: test.info().outputPath("methane.png") });
  });
});

test.describe("Rotate-and-identify 3D", () => {
  test("is answered with ordinary choices and graded like Multiple choice", async ({ page }) => {
    await page.goto(`${LESSON}#s06`);
    await expect(page.getByRole("application", { name: /Water/ })).toBeVisible();
    const choose = (name: string) => page.getByRole("group", { name: "Choices" }).getByRole("button", { name }).click();
    await choose("linear");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("status")).toContainText("Rotate a quarter turn (↻). Do the two H's and the O line up?");
    await choose("bent");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("status")).toContainText("✓ Correct.");
  });

  test("the Step's own words open the Describe text", async ({ page }) => {
    await page.goto(`${LESSON}#s03`);
    await page.getByRole("button", { name: "Describe" }).click();
    await expect(live(page)).toContainText("Methane. Carbon in the centre, four hydrogens at the corners of a tetrahedron, each 1.09 Å from carbon.");
  });
});

test.describe("without WebGL", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        return /webgl/.test(kind) ? null : (real as (...a: unknown[]) => unknown).call(this, kind, ...rest);
      } as typeof real;
    });
  });

  test("shows a still with the same text, and the Step can still be finished", async ({ page }) => {
    await page.goto(`${LESSON}#s06`);
    const water = card(page);
    await expect(water.locator("canvas")).toHaveCount(0);
    await expect(water.locator(".molecule-still circle")).toHaveCount(3);
    // End-on, the far H hides behind the near one, so only the O and the near H are lettered.
    await expect(water.locator(".molecule-letter")).toHaveCount(2);
    expect((await water.locator(".molecule-letter").allTextContents()).sort()).toEqual(["H", "O"]);
    await expect(page.getByRole("application", { name: "Water, ball and stick" })).toBeVisible();
    await expect(water).toContainText("Still image");
    await page.getByRole("button", { name: "Describe" }).click();
    await expect(water.locator("[aria-live]")).toContainText("Water: 3 atoms. O1 is bonded to H1 and H2.");
    await page.getByRole("group", { name: "Choices" }).getByRole("button", { name: "bent" }).click();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("status")).toContainText("Correct.");
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });
});
