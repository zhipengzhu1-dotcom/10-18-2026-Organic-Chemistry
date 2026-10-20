import { expect, test } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/molecules-in-3d";

test("a cited angle shows 1 decimal, with its Source note one tap away", async ({ page }) => {
  // Lesson 3 s05 cites methane's, ammonia's and water's measured angles.
  await page.goto(`${LESSON}#s05`);
  await expect(page.getByText("Step 5 of 15")).toBeVisible();
  await expect(page.getByText(/Measured: CH₄ 109\.5°, NH₃ 106\.7°, H₂O 104\.5°\./)).toBeVisible();

  const note = page.getByText("ⓘ Where these numbers come from");
  // The citation as CCCBDB lists it (methane.json is written by the geometry pipeline, #67).
  const full = page.getByText(/E Hirota "Anharmonic Potential Function and Equilibrium Structure of Methane" J\. Mol\. Spect\. 77, 213-221 \(1979\)/);
  await expect(note).toBeVisible();
  await expect(full).toBeHidden();
  await note.click();
  await expect(page.getByText("Geometry: experimental (gas phase).").first()).toBeVisible();
  await expect(full).toBeVisible();
  await expect(full).toContainText("via NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z");

  // A Step without cited numbers has no Source note.
  await page.goto(`${LESSON}#s04`);
  await expect(page.getByText("Step 4 of 15")).toBeVisible();
  await expect(note).toHaveCount(0);
});
