import { expect, test } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/sample-carbons-four-bonds";

test("a cited number shows 2 decimals, with its Source note one tap away", async ({ page }) => {
  await page.goto(LESSON);
  await page.getByRole("group", { name: "Choices" }).getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // s02 cites methane's C–H bond length.
  await expect(page.getByText("Step 2 of 10")).toBeVisible();
  await expect(page.getByText("1.09 Å long")).toBeVisible();

  const note = page.getByText("ⓘ Where these numbers come from");
  // The citation as CCCBDB lists it (methane.json is written by the geometry pipeline, #67).
  const full = page.getByText(/C–H 1\.087 Å from E Hirota "Anharmonic Potential Function and Equilibrium Structure of Methane" J\. Mol\. Spect\. 77, 213-221 \(1979\)/);
  await expect(note).toBeVisible();
  await expect(full).toBeHidden();
  await note.click();
  await expect(page.getByText("Geometry: experimental (gas phase).")).toBeVisible();
  await expect(full).toBeVisible();
  await expect(full).toContainText("via NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z");

  // A Step without cited numbers has no Source note.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 3 of 10")).toBeVisible();
  await expect(note).toHaveCount(0);
});
