// Lesson 4, Hybridization & Orbitals (#82), played start to Wrap from the keyboard on a phone and
// on a laptop: every graded Step answered wrong once (to see a Hint) and then right, the model
// Scenes' screen-reader text checked, the 3D cards turned and measured, the σ/π Show toggle and the
// plane sheet worked. Numbers come from the cited CCCBDB geometry (methane C–H 1.087 Å, H–C–H
// 109.471°; ethylene H–C–H 117.6°; C–C ethane 1.536, ethylene 1.339, acetylene 1.203 Å).
import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/hybridization-orbitals";

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

    test("a Student plays Lesson 4 to the Wrap with the keyboard only", async ({ page }) => {
      test.setTimeout(150_000);
      await page.goto(LESSON);
      const status = page.getByRole("status");
      const at = (n: number) => expect(page.getByText(`Step ${n} of 15`)).toBeVisible();
      const check = () => press(page, page.getByRole("button", { name: "Check" }));
      const next = () => press(page, page.getByRole("button", { name: "Continue" }));
      const choice = (name: string) => page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: true });
      const live = page.locator("figure.molecule [aria-live]");
      const pick = async (name: string) => {
        await press(page, choice(name));
        await check();
      };
      const show = (name: string) => page.getByRole("group", { name: "Show" }).getByRole("button", { name, exact: true });

      // s01 Hook: carbon's unmixed orbitals; any guess reveals unmixed vs real methane.
      await at(1);
      await expect(page.getByRole("img", { name: /one round 2s orbital and three 2p orbitals/ })).toBeVisible();
      await pick("a flat square of four H's");
      await expect(status).toContainText("Unmixed orbitals would give b");
      await expect(status).toContainText("1.09 Å each, and every H–C–H angle is 109.5°");
      await expect(page.getByRole("img", { name: /Right, real methane, measured: four identical C–H bonds of 1\.09 Å/ })).toBeVisible();
      await next();

      // s02: the hybrid-mixing video (watch-only, silent).
      await at(2);
      await expect(page.getByRole("img", { name: /Four in, four out\. Labelled: model\./ })).toBeVisible();
      await next();

      // s03: three in, three out.
      await at(3);
      await expect(page.getByRole("img", { name: /How many hybrid orbitals come out\?/ })).toBeVisible();
      const answer = page.getByRole("textbox", { name: "Answer" });
      await answer.fill("2");
      await check();
      await expect(status).toContainText("You mixed three orbitals");
      await answer.fill("3");
      await check();
      await expect(status).toContainText("✓ Correct. Three in, three out");
      await expect(page.getByRole("img", { name: /mix into three sp2 hybrid orbitals/ })).toBeVisible();
      await next();

      // s04: the hybrid sets, with the model's angles.
      await at(4);
      await expect(page.getByRole("img", { name: /model angle 109\.5 degrees/ })).toBeVisible();
      await next();

      // s05: measure H–C–H on ethylene from the keyboard, then name the set.
      await at(5);
      await page.getByRole("application", { name: /Ethylene/ }).focus();
      for (const key of ["]", "]", "]", "Enter", "[", "[", "Enter", "]", "]", "]", "Enter"]) await page.keyboard.press(key);
      await expect(live).toHaveText(/Angle H1, C1, H2: 117\.6 degrees, at C1\./);
      await pick("sp³");
      await expect(status).toContainText("sp³ needs four groups");
      await pick("sp²");
      await expect(status).toContainText("✓ Correct. Each carbon has three groups");
      await expect(status).toContainText("117.6° (H–C–H)");
      await next();

      // s06: σ, then π, then both play once on the card, the plane on; then the toggle is the Student's.
      await at(6);
      await expect(show("σ + π")).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
      await expect(page.getByRole("button", { name: "Plane", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("application", { name: /computed C–C σ bond orbital and C=C π bond orbital/ })).toBeVisible();
      await press(page, show("π"));
      await expect(page.getByRole("application", { name: /computed C=C π bond orbital$/ })).toBeVisible();
      await next();

      // s07 (signature): only the π bond, from straight above; the plane toggle helps.
      await at(7);
      const plane = page.getByRole("button", { name: "Plane", exact: true });
      await expect(plane).toHaveAttribute("aria-pressed", "false");
      await press(page, plane);
      await expect(plane).toHaveAttribute("aria-pressed", "true");
      await press(page, page.getByRole("button", { name: "Describe" }));
      await expect(live).toContainText("one lobe above the plane of the six atoms and one below");
      await pick("on the line between the two carbons");
      await expect(status).toContainText("That's where the σ bond lives");
      await pick("above and below the plane of the six atoms");
      await expect(status).toContainText("✓ Correct. Side-on overlap puts the π electrons above and below the plane");
      await next();

      // s08: twist until the overlap is gone.
      await at(8);
      const twist = page.getByRole("slider", { name: "Twist" });
      await press(page, twist, "ArrowRight");
      await page.keyboard.press("ArrowRight");
      await check();
      await expect(status).toContainText("Still overlapping a little");
      await twist.focus();
      for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("img", { name: /Twist 90 degrees\. The two p orbitals are at right angles\. π overlap: none\./ })).toBeVisible();
      await check();
      await expect(status).toContainText("✓ Correct. At 90° the two p orbitals are at right angles");
      await next();

      // s09: acetylene's σ, π₁, π₂ and both π play through, ending on all of them.
      await at(9);
      await expect(show("all")).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
      await press(page, show("both π"));
      await expect(page.getByRole("application", { name: /Acetylene.*computed/ })).toBeVisible();
      await next();

      // s10: each card measures its C–C on load; rank them.
      await at(10);
      await expect(page.locator(".molecule-value")).toHaveText("1.54 Å");
      await press(page, page.getByRole("group", { name: "Molecule" }).getByRole("button", { name: "Acetylene" }));
      await expect(page.locator(".molecule-value")).toHaveText("1.20 Å");
      const card = (name: string) => page.getByRole("list", { name: "Order" }).getByRole("button", { name, exact: true });
      await press(page, card("acetylene C≡C"), "ArrowUp");
      await press(page, card("acetylene C≡C"), "ArrowUp");
      await check();
      await expect(status).toContainText("Compare ethane and ethylene");
      await press(page, card("ethylene C=C"), "ArrowUp");
      await check();
      await expect(status).toContainText("✓ Correct. 1.20 Å < 1.34 Å < 1.54 Å");
      await next();

      // s11–s14: the Check Problems.
      await at(11);
      await page.getByRole("textbox", { name: "Answer" }).fill("2");
      await check();
      await expect(status).toContainText("A triple bond holds two π bonds");
      await page.getByRole("textbox", { name: "Answer" }).fill("3");
      await check();
      await expect(status).toContainText("✓ Correct. The C=C has one π and the C≡N has two");
      await next();

      await at(12);
      const atom = (name: string) => page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name, exact: true });
      await press(page, atom("C3"));
      await check();
      await expect(status).toContainText("C3 has four single bonds");
      for (const name of ["C1", "C2"]) await press(page, atom(name));
      await check();
      await expect(status).toContainText("✓ Correct. C1 and C2 each have three groups");
      await next();

      await at(13);
      await pick("sp², bent, with one empty p orbital");
      await expect(status).toContainText("two Cl's and no lone pairs");
      await pick("sp, linear (model: 180°), with two empty p orbitals");
      await expect(status).toContainText("✓ Correct. Two groups → two sp hybrids in a line");
      await next();

      await at(14);
      await expect(page.getByRole("application", { name: /Ketene.*computed/ })).toBeVisible();
      await press(page, page.getByRole("button", { name: "H–C–H plane", exact: true }));
      await pick("the C=C π lying in the H–C–H plane; the C=O π above and below it");
      await expect(status).toContainText("its leftover p stands at right angles to the H–C–H plane");
      await pick("the C=C π above and below the H–C–H plane; the C=O π lying in that plane");
      await expect(status).toContainText("✓ Correct. The middle carbon is sp");
      await next();

      // s15 Wrap and the Lesson-end screen.
      await at(15);
      await expect(page.getByText("Key idea")).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to Unit" })).toBeVisible();
    });
  });
}

test("Lesson 4's answers are not in the page's HTML", async ({ request }) => {
  const html = await (await request.get(LESSON)).text();
  for (const secret of ["Three in, three out", "Side-on overlap puts the π electrons", "methane-unmixed-vs-real", "Each π bond adds another overlap"])
    expect(html).not.toContain(secret);
});
