// Computed orbitals on the 3D Step card (#70), on the sample Lesson's ethylene π Step (s11): the
// mesh loads only on the Step that uses it, the lobes are drawn translucent over the atoms (above
// and below the edge-on plane), each sign carries a label, the orbital its chip, and the Source note
// says the orbitals are computed.
import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/sample-3d";
const MESH = "/orbitals/ethylene-orbitals/pi.glb";

const card = (page: Page) => page.locator("figure.molecule");

/** Counts lobe-cyan pixels above and below a screen row in a screenshot of the card's frame. */
async function cyanAboveBelow(page: Page, row: number) {
  const frame = card(page).locator(".molecule-frame");
  const box = (await frame.boundingBox())!;
  const png = await frame.screenshot();
  return page.evaluate(
    async ({ b64, row, height }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      [c.width, c.height] = [img.width, img.height];
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      const cut = (row / height) * c.height;
      let above = 0;
      let below = 0;
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        // Electron cyan (#3ee8ff) blended over the dark stage: low red, high green and blue.
        if (b > 90 && g > 80 && r < 0.6 * b) {
          const y = Math.floor(i / 4 / c.width);
          if (y < cut - 4) above++;
          else if (y > cut + 4) below++;
        }
      }
      return { above, below };
    },
    { b64: png.toString("base64"), row: row - box.y, height: box.height },
  );
}

test.describe("computed orbitals on the 3D card", () => {
  test("load their mesh only on the Step that shows them", async ({ page }) => {
    const meshes: string[] = [];
    page.on("request", (r) => r.url().includes("/orbitals/") && meshes.push(new URL(r.url()).pathname));
    await page.goto(`${LESSON}#s02`);
    await expect(card(page).locator("canvas")).toHaveCount(1);
    expect(meshes).toEqual([]);

    await page.goto(`${LESSON}#s11`);
    await expect(card(page).locator(".molecule-stage")).toHaveAttribute("data-orbitals", "drawn");
    expect(meshes).toEqual([MESH]);
  });

  test("ethylene's π shows translucent lobes above and below the edge-on plane, with sign labels and a chip", async ({ page }) => {
    await page.goto(`${LESSON}#s11`);
    await expect(card(page).locator(".molecule-stage")).toHaveAttribute("data-orbitals", "drawn");

    // Chip names the orbital and says it is computed; never colour alone: + and − label the lobes.
    await expect(card(page).locator(".orbital-chip")).toHaveText(["π computed"]);
    const signs = card(page).locator(".orbital-sign");
    await expect(signs).toHaveText(["+", "−"]);

    // The carbons sit on one row (edge-on view); one lobe is above it, the other below.
    const carbons = card(page).locator('.molecule-letter:text-is("C")');
    await expect(carbons).toHaveCount(2);
    const cBox = (await carbons.first().boundingBox())!;
    const row = cBox.y + cBox.height / 2;
    const ys = await Promise.all([0, 1].map(async (i) => (await signs.nth(i).boundingBox())!.y));
    // The solid (+) lobe above the plane, the hatched (−) one below, as Lesson 4 draws it.
    expect(ys[0]).toBeLessThan(row - 10);
    expect(ys[1]).toBeGreaterThan(row + 10);

    // The drawn lobes: cyan pixels on both sides of the plane (solid above or below, hatched opposite).
    const { above, below } = await cyanAboveBelow(page, row);
    expect(above).toBeGreaterThan(300);
    expect(below).toBeGreaterThan(300);

    // The atoms still show through the lobes: both carbons and the front hydrogens are lettered
    // (edge-on, each back H hides behind a front one).
    expect((await card(page).locator(".molecule-letter").allTextContents()).sort()).toEqual(["C", "C", "H", "H"]);
    await card(page).screenshot({ path: test.info().outputPath("ethylene-pi.png") });
  });

  test("the Source note says the orbitals are computed, how, and at what isovalue", async ({ page }) => {
    await page.goto(`${LESSON}#s11`);
    await page.locator("details.source-note summary").click();
    const note = page.locator("details.source-note");
    await expect(note).toContainText("Computed, not measured.");
    await expect(note).toContainText("Isosurface value 0.05 a.u.");
    await expect(note).toContainText("intrinsic bond orbitals");
    await expect(note).toContainText("B3LYP/cc-pVTZ");
  });
});
