// Computed orbitals on the 3D Step card (#70), on Lesson 4's σ / π Step (s06, π picked): the
// mesh loads only on the Step that uses it, the lobes are drawn translucent over the atoms (above
// and below the edge-on plane), each sign carries a label, the orbital its chip, and the Source note
// says the orbitals are computed.
import { expect, test, type Page } from "@playwright/test";

const UNIT = "/organic/orgo-1/structure-bonding";
const STEP = `${UNIT}/hybridization-orbitals#s06`;
const SIGMA = "/orbitals/ethylene-orbitals/sigma.glb";
const MESH = "/orbitals/ethylene-orbitals/pi.glb";

/** Lesson 4 s06 opens on σ; its π button shows the π orbital alone. */
async function openPi(page: Page) {
  await page.goto(STEP);
  await page.getByRole("button", { name: "π", exact: true }).click();
  await expect(card(page).locator(".orbital-chip")).toHaveText(["π computed"]);
}

const card = (page: Page) => page.locator("figure.molecule");

/**
 * Reads a screenshot of the card's frame on the paper stage (#122): blue marker-fill pixels and
 * blue pen-line pixels above and below a screen row (pen pixels count only clear of the atoms on
 * the row), and the stage's ground at a corner.
 */
async function lobePixels(page: Page, row: number) {
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
      const fill = { above: 0, below: 0 };
      const pen = { above: 0, below: 0 };
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const y = Math.floor(i / 4 / c.width);
        const side = y < cut - 4 ? "above" : y > cut + 4 ? "below" : null;
        if (!side) continue;
        // The blue marker fill (#4dabff) laid over white paper: light, clearly blue.
        if (b > 225 && r < b - 50 && r > 60) fill[side]++;
        // The blue pen line (#0a64c2) round each lobe, clear of the atoms on the row.
        if (Math.abs(y - cut) > 30 && b > 130 && r < 60 && g < 130 && g > r + 25) pen[side]++;
      }
      // Top centre: clear of the readout (left), the buttons (right) and the lobes.
      const at = (8 * c.width + Math.floor(c.width / 2)) * 4;
      const ground = [data[at], data[at + 1], data[at + 2]];
      return { fill, pen, ground };
    },
    { b64: png.toString("base64"), row: row - box.y, height: box.height },
  );
}

test.describe("computed orbitals on the 3D card", () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test("load their mesh only on the Step that shows them", async ({ page }) => {
    const meshes: string[] = [];
    page.on("request", (r) => r.url().includes("/orbitals/") && meshes.push(new URL(r.url()).pathname));
    // Lesson 3's methane card has no orbitals.
    await page.goto(`${UNIT}/molecules-in-3d#s03`);
    await expect(card(page).locator("canvas")).toHaveCount(1);
    expect(meshes).toEqual([]);

    await page.goto(STEP);
    await expect(card(page).locator(".molecule-stage")).toHaveAttribute("data-orbitals", "drawn");
    // σ first. The toggle autoplays to π after 1.8 s, which a busy machine can reach before σ is drawn.
    expect(meshes[0]).toBe(SIGMA);
    await page.getByRole("button", { name: "π", exact: true }).click();
    await expect(card(page).locator(".orbital-chip")).toHaveText(["π computed"]);
    await expect(card(page).locator(".molecule-stage")).toHaveAttribute("data-orbitals", "drawn");
    expect([...new Set(meshes)]).toEqual([SIGMA, MESH]);
  });

  test("ethylene's π shows translucent lobes above and below the edge-on plane, with sign labels and a chip", async ({ page }) => {
    await openPi(page);
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

    // The drawn lobes on the paper stage: blue marker fill on both sides of the plane (solid above
    // or below, hatched opposite), each inside a blue pen line, since a fill never stands alone on white.
    const { fill, pen, ground } = await lobePixels(page, row);
    expect(ground).toEqual([255, 255, 255]);
    expect(fill.above).toBeGreaterThan(300);
    expect(fill.below).toBeGreaterThan(300);
    expect(pen.above).toBeGreaterThan(40);
    expect(pen.below).toBeGreaterThan(40);

    // The atoms still show through the lobes: both carbons and the front hydrogens are lettered
    // (edge-on, each back H hides behind a front one).
    expect((await card(page).locator(".molecule-letter").allTextContents()).sort()).toEqual(["C", "C", "H", "H"]);
    await card(page).screenshot({ path: test.info().outputPath("ethylene-pi.png") });
  });

  test("the Source note says the orbitals are computed, how, and at what isovalue", async ({ page }) => {
    await openPi(page);
    await page.locator("details.source-note summary").click();
    const note = page.locator("details.source-note");
    await expect(note).toContainText("Computed, not measured.");
    await expect(note).toContainText("Isosurface value 0.05 a.u.");
    await expect(note).toContainText("intrinsic bond orbitals");
    await expect(note).toContainText("B3LYP/cc-pVTZ");
  });
});
