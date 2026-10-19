// Lesson 3, Molecules in 3D (#81), played start to Wrap from the keyboard on a phone and on a
// laptop: every Step answered (most wrong first, to see a Hint), the 3D card turned, measured,
// snapped to the page, the dipoles added, and every Scene's screen-reader text checked.
// Numbers come from the cited geometry (CCCBDB methane H–C–H 109.471°, water 104.4776°, …).
import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/molecules-in-3d";

async function press(page: Page, target: ReturnType<Page["getByRole"]>, key = "Enter") {
  await target.focus();
  await page.keyboard.press(key);
}

for (const [device, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["laptop", { width: 1280, height: 800 }],
] as const) {
  test.describe(`on a ${device}`, () => {
    test.use({ viewport });

    test("a Student plays Lesson 3 to the Wrap with the keyboard only", async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(LESSON);
      const status = page.getByRole("status");
      const at = (n: number) => expect(page.getByText(`Step ${n} of 15`)).toBeVisible();
      const check = () => press(page, page.getByRole("button", { name: "Check" }));
      const next = () => press(page, page.getByRole("button", { name: "Continue" }));
      const choice = (name: string | RegExp) =>
        page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: typeof name === "string" });
      const live = page.locator("figure.molecule [aria-live]");
      const pick = async (name: string) => {
        await press(page, choice(name));
        await check();
      };

      // s01 Hook: the flat drawing with its right angle; any prediction reveals the measured angle.
      await at(1);
      await expect(page.getByRole("img", { name: /right-angle mark between the top H and the right H/ })).toBeVisible();
      await pick("a right angle, like the drawing");
      await expect(status).toContainText("Bigger: 109.5°");
      await expect(page.getByRole("img", { name: /every H–C–H angle is equal: 109\.5 degrees/ })).toBeVisible();
      await next();

      // s02: domains push apart (the model's angles, named as the model's).
      await at(2);
      await expect(page.getByRole("img", { name: /a line, model angle 180 degrees/ })).toBeVisible();
      await next();

      // s03: measure an H–C–H angle from the keyboard, then answer.
      await at(3);
      const methane = page.getByRole("application", { name: /Methane/ });
      await methane.focus();
      for (const key of ["]", "]", "Enter", "[", "Enter", "]", "]", "Enter"]) await page.keyboard.press(key);
      await expect(live).toHaveText(/Angle H1, C1, H2: 109\.5 degrees, at C1\./);
      await pick("some angles are right angles, some are wider");
      await expect(status).toContainText("Measure two or three more pairs");
      await pick("every H–C–H angle is the same");
      await expect(status).toContainText("✓ Correct. All six H–C–H angles read 109.5°");
      await next();

      // s04: count ammonia's domains.
      await at(4);
      const answer = page.getByRole("textbox", { name: "Answer" });
      await answer.fill("3");
      await check();
      await expect(status).toContainText("You counted the bonds.");
      await answer.fill("4");
      await check();
      await expect(status).toContainText("✓ Correct. Three bonds plus one lone pair");
      await next();

      // s05: the four-domain family, with the measured angles.
      await at(5);
      await expect(page.getByRole("img", { name: /H–N–H 106\.7 degrees/ })).toBeVisible();
      await next();

      // s06: water starts end-on; Describe reads it; bent.
      await at(6);
      await press(page, page.getByRole("button", { name: "Describe" }));
      await expect(live).toContainText("The H–O–H angle is 104.5°");
      await pick("linear");
      await expect(status).toContainText("Rotate a quarter turn");
      await pick("bent");
      await expect(status).toContainText("✓ Correct. Bent:");
      await next();

      // s07: formaldehyde's domains; the reveal reads the measured angles.
      await at(7);
      await pick("2 domains: linear");
      await expect(status).toContainText("Count carbon's neighbours");
      await pick("3 domains: flat triangle (trigonal planar)");
      await expect(status).toContainText("✓ Correct. The double bond's electrons");
      await next();

      // s08: line, wedge and dash; methane is one tap away in 3D.
      await at(8);
      await expect(page.getByRole("img", { name: /two lines, one wedge and one dash/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /Explore in 3D/ })).toBeVisible();
      await next();

      // s09 (signature): ethanol off the page; a wrong try offers Snap to page; the badge says so.
      await at(9);
      const badge = page.locator(".molecule-badge");
      await expect(badge).toHaveText("Not in the page");
      await pick("both in the page");
      await expect(status).toContainText("Turn the model a quarter turn");
      await press(page, page.getByRole("button", { name: "Snap to page" }));
      await expect(badge).toHaveText("In the page");
      await press(page, page.getByRole("button", { name: "Describe" }));
      await expect(live).toContainText("O1, C1 and C2 are in the page. On C1,");
      await pick("one toward you, one away");
      await expect(status).toContainText("✓ Correct. Two bonds in the page");
      // The reveal settles the card on the page view and labels C1's two H's.
      await expect(page.locator(".molecule-side")).toHaveCount(2);
      await expect(page.locator("figure.molecule")).toContainText("toward you: wedge");
      await expect(page.locator("figure.molecule")).toContainText("away: dash");
      await next();

      // s10: the 3D drawing cards.
      await at(10);
      await pick("Lines to the top H and the left H; two wedges, lower right.");
      await expect(status).toContainText("can't both come toward you");
      await pick("Lines to the top H and the left H; a wedge and a dash side by side, lower right.");
      await expect(status).toContainText("✓ Correct. Two in-page bonds make a V");
      await next();

      // s11: Add the pulls for water, then for CO₂.
      await at(11);
      await press(page, page.getByRole("button", { name: "Add" }));
      await expect(live).toContainText("net arrow");
      await press(page, page.getByRole("group", { name: "Molecule" }).getByRole("button", { name: "CO₂" }));
      await press(page, page.getByRole("button", { name: "Add" }));
      await expect(live).toContainText("net zero");
      await pick("both");
      await expect(status).toContainText("Equal and opposite pulls cancel");
      await pick("water only");
      await expect(status).toContainText("✓ Correct. Water is bent");
      await expect(page.getByRole("img", { name: /Added, they cancel: net zero, nonpolar/ })).toBeVisible();
      await next();

      // s12–s14: the Check Problems.
      await at(12);
      await press(page, page.getByRole("group", { name: "Molecule" }).getByRole("button", { name: "NH₃" }));
      await expect(page.getByRole("application", { name: /Ammonia/ })).toBeVisible();
      await pick("NH₃ only");
      await expect(status).toContainText("Count N's domains");
      await pick("BF₃ only");
      await expect(status).toContainText("✓ Correct. Boron has three domains");
      await next();

      await at(13);
      await pick("CH₂CH₃ on the dash, CH₃ on the wedge");
      await expect(status).toContainText("Turn the model so F points upper right");
      await pick("CH₃ on the dash, CH₂CH₃ on the wedge");
      await expect(status).toContainText("✓ Correct. CH₃ goes back on the dash");
      await next();

      await at(14);
      await press(page, choice("H₂O: bent, two lines."));
      await press(page, choice("CO₂: a straight line."));
      await check();
      await expect(status).toContainText("CO₂ is a straight line");
      // A Check clears the picks, so pick all three again.
      for (const name of ["H₂O: bent, two lines.", "CH₂Cl₂: two Cl lines, an H wedge and an H dash.", "NH₃: lone pair up; one H line, one wedge, one dash."])
        await press(page, choice(name));
      await check();
      await expect(status).toContainText("✓ Correct. Water, dichloromethane and ammonia");
      await expect(page.getByRole("img", { name: /Carbon tetrachloride: tetrahedral\. 4 bond-dipole arrows/ })).toBeVisible();
      await next();

      // s15 Wrap and the Lesson-end screen.
      await at(15);
      await expect(page.getByText("Key idea")).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to Unit" })).toBeVisible();
    });
  });
}

test("Lesson 3's answers are not in the page's HTML", async ({ request }) => {
  const html = await (await request.get(LESSON)).text();
  for (const secret of ["Two bonds in the page means", "dipole-sum", "Equal and opposite pulls cancel", "CH₃ goes back on the dash"])
    expect(html).not.toContain(secret);
});
